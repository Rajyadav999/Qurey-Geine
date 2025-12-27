import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from passlib.context import CryptContext
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_community.utilities import SQLDatabase
from langchain_groq import ChatGroq
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, inspect
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import ast
import json
import re

# Load environment variables
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
assert groq_api_key is not None, "GROQ_API_KEY not found in environment variables"

# EMAIL CONFIGURATION
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    print("WARNING: Email credentials not found. OTP sending will be disabled.")
    
# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SQLite Database Setup
SQLITE_DB_FILE = "users.db"
engine = create_engine(f"sqlite:///{SQLITE_DB_FILE}", echo=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String, nullable=False)
    messages = Column(Text, nullable=False)

# Create the database tables
Base.metadata.create_all(engine)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:8081", 
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global storage
otp_storage = {}
pending_sql_actions = {}

# Pydantic Models
class DBConfig(BaseModel):
    host: str
    port: int
    user: str
    password: str = ""
    database: str

class ChatRequest(BaseModel):
    question: str
    chat_history: list

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str = None
    password: str
    otp: str
    gender: str
    username: str

class UserLogin(BaseModel):
    identifier: str
    password: str

class OtpRequest(BaseModel):
    email: EmailStr

class ConfirmSQLRequest(BaseModel):
    user_id: int
    confirm: bool
    sql: str

# Database Session Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper Functions
def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(recipient_email: str, otp: str) -> bool:
    """Best-effort OTP email sender."""
    if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
        print(f"[OTP] Email credentials missing; OTP for {recipient_email}: {otp}")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your Verification Code"
    message["From"] = EMAIL_HOST_USER
    message["To"] = recipient_email

    html = f"""
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <h2>Welcome to Query Genie!</h2>
            <p>Your one-time verification code is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #007BFF;">{otp}</p>
            <p>This code will expire in 5 minutes.</p>
        </div>
    </body>
    </html>
    """
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(EMAIL_HOST_USER, recipient_email, message.as_string())
        print(f"[OTP] Email sent to {recipient_email}")
        return True
    except Exception as e:
        print(f"[OTP] Failed to send email to {recipient_email}: {e}")
        return False

# ============= IMPROVED SQL SAFETY =============
# SQL Injection Prevention
DANGEROUS_KEYWORDS = ["DROP", "TRUNCATE", "DELETE", "ALTER", "UPDATE"]
FORBIDDEN_PATTERNS = [
    r";\s*DROP",  # SQL injection attempt
    r"--",  # SQL comments
    r"/\*.*\*/",  # SQL multi-line comments
    r"UNION\s+SELECT",  # UNION-based injection
    r"OR\s+1\s*=\s*1",  # Always-true conditions
    r"AND\s+1\s*=\s*1",
    r"'\s*OR\s*'",
    r";\s*EXEC",  # Command execution
    r"xp_cmdshell",  # SQL Server command execution
]

def detect_dangerous_sql(sql: str):
    """Enhanced SQL danger detection"""
    sql_upper = sql.upper()
    dangerous = [kw for kw in DANGEROUS_KEYWORDS if kw in sql_upper]
    
    # Check for injection patterns
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, sql, re.IGNORECASE):
            dangerous.append(f"INJECTION_PATTERN: {pattern}")
    
    return dangerous

def sanitize_sql_input(sql: str) -> str:
    """Basic SQL sanitization"""
    # Remove dangerous characters and patterns
    sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)  # Remove SQL comments
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)  # Remove multi-line comments
    return sql.strip()

def sql_to_table_preview(sql: str):
    """Generate preview table for dangerous operations"""
    sql_upper = sql.upper()
    action = "UNKNOWN"
    table = "-"
    condition = "-"

    if sql_upper.startswith("DELETE"):
        action = "DELETE"
        match = re.search(r"FROM\s+`?(\w+)`?", sql_upper)
        if match:
            table = match.group(1)
        where_match = re.search(r"WHERE\s+(.+)", sql, re.IGNORECASE)
        if where_match:
            condition = where_match.group(1)
    elif sql_upper.startswith("UPDATE"):
        action = "UPDATE"
        match = re.search(r"UPDATE\s+`?(\w+)`?", sql_upper)
        if match:
            table = match.group(1)
        where_match = re.search(r"WHERE\s+(.+)", sql, re.IGNORECASE)
        if where_match:
            condition = where_match.group(1)
    elif sql_upper.startswith("DROP"):
        action = "DROP"
        match = re.search(r"DROP\s+TABLE\s+`?(\w+)`?", sql_upper)
        if match:
            table = match.group(1)

    return {
        "columns": ["Action", "Table", "Condition", "Impact"],
        "data": [[action, table, condition, "Removes/modifies record(s) permanently"]]
    }

# Auth Helpers
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(identifier: str, db):
    """Get user by email OR username"""
    user = db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()
    return user

# ============= IMPROVED COLUMN DETECTION =============
def get_columns_from_query_result(db_uri: str, sql_query: str) -> list:
    """
    Execute query and get actual column names from result metadata.
    This is the most reliable method.
    """
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(db_uri)
        
        with engine.connect() as conn:
            result = conn.execute(text(sql_query))
            # Get column names directly from result metadata
            columns = list(result.keys())
            return columns
    except Exception as e:
        print(f"Error getting columns from query result: {e}")
        return []

def get_columns_from_table_inspector(db_uri: str, table_name: str) -> list:
    """
    Use SQLAlchemy inspector to get column names from table schema.
    Most reliable for table structure.
    """
    try:
        from sqlalchemy import create_engine, inspect
        engine = create_engine(db_uri)
        inspector = inspect(engine)
        
        # Get columns for the table
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        print(f"Inspector found columns for {table_name}: {columns}")
        return columns
    except Exception as e:
        print(f"Error using inspector: {e}")
        return []

def extract_table_name_from_query(sql_query: str) -> str:
    """Extract table name from SQL query"""
    try:
        # Handle different query formats
        patterns = [
            r'FROM\s+`?(\w+)`?',  # Standard FROM clause
            r'JOIN\s+`?(\w+)`?',  # JOIN clause
            r'INTO\s+`?(\w+)`?',  # INSERT INTO
            r'UPDATE\s+`?(\w+)`?',  # UPDATE
        ]
        
        for pattern in patterns:
            match = re.search(pattern, sql_query, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    except Exception as e:
        print(f"Error extracting table name: {e}")
        return None

# LangChain Helpers
def get_sql_chain(db):
    template = """
    You are a MySQL expert. Given the schema and chat history,
    generate a SINGLE valid MySQL statement (DDL, DML, DCL, TCL, or queries with JOINS/CONSTRAINTS/TRIGGERS).
    Include only the SQL; no explanations, markdown, or extra text.

    Schema:
    {schema}

    Chat History:
    {chat_history}

    User Question:
    {question}

    Your response must contain ONLY the SQL statement. Do NOT add any extra text, commentary, or code formatting like ```sql.
    """
    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatGroq(api_key=groq_api_key, model="llama-3.1-8b-instant", temperature=0)
    
    def get_schema(_):
        return db.get_table_info()
    
    return (
        RunnablePassthrough.assign(schema=get_schema)
        | prompt
        | llm
        | StrOutputParser()
    )

def get_response(question, db, chat_history, db_uri):
    chain = get_sql_chain(db)
    formatted_chat_history = "\n".join([
        f"{'Human' if isinstance(msg, HumanMessage) else 'AI'}: {msg.content}"
        for msg in chat_history
    ])
    
    try:
        response_text = chain.invoke({
            "question": question,
            "chat_history": formatted_chat_history
        })
        
        sql_query = response_text.strip()
        sql_query = re.sub(r'^```sql\s*', '', sql_query)
        sql_query = re.sub(r'\s*```$', '', sql_query)
        sql_query = sql_query.strip()
        
        # Sanitize SQL to prevent injection
        sql_query = sanitize_sql_input(sql_query)
        
        # Check for dangerous operations
        dangerous_ops = detect_dangerous_sql(sql_query)
        
        if dangerous_ops:
            return json.dumps({
                "type": "confirmation_required",
                "sql": sql_query,
                "table": sql_to_table_preview(sql_query),
                "warnings": dangerous_ops
            })
        
        sql_upper = sql_query.upper()
        is_select = sql_upper.startswith('SELECT')
        
        if is_select:
            # Method 1: Get columns from query execution (MOST RELIABLE)
            columns = get_columns_from_query_result(db_uri, sql_query)
            
            # Method 2: If that fails, try inspector on table
            if not columns:
                table_name = extract_table_name_from_query(sql_query)
                if table_name:
                    columns = get_columns_from_table_inspector(db_uri, table_name)
            
            print(f"\n=== COLUMN DETECTION ===")
            print(f"SQL: {sql_query}")
            print(f"Detected Columns: {columns}")
            print(f"========================\n")
        
        # Execute query
        result = db.run(sql_query)
        
        if is_select:
            clean_result = result.strip()
            
            if clean_result == '[]' or clean_result == '' or 'Empty set' in clean_result or '0 rows' in clean_result:
                output_data = {
                    "type": "select",
                    "data": [],
                    "columns": columns or [],
                    "row_count": 0
                }
            elif clean_result.startswith('[') and clean_result.endswith(']'):
                try:
                    cleaned = re.sub(r"Decimal\('([^']+)'\)", r"'\1'", clean_result)
                    
                    try:
                        raw_data = json.loads(cleaned.replace("'", '"').replace('None', 'null'))
                    except:
                        raw_data = ast.literal_eval(cleaned)
                    
                    if isinstance(raw_data, list):
                        if not raw_data:
                            data = []
                        elif isinstance(raw_data[0], (tuple, list)):
                            data = []
                            for row in raw_data:
                                row_data = []
                                for cell in row:
                                    if cell is None:
                                        row_data.append('')
                                    elif isinstance(cell, (int, float)):
                                        row_data.append(str(cell))
                                    elif isinstance(cell, bytes):
                                        row_data.append(cell.decode('utf-8', errors='ignore'))
                                    else:
                                        row_data.append(str(cell))
                                data.append(row_data)
                        else:
                            data = [[str(item) if item is not None else ''] for item in raw_data]
                        
                        # Ensure column count matches data
                        if data and columns:
                            expected_cols = len(data[0])
                            if len(columns) != expected_cols:
                                print(f"WARNING: Column count mismatch. Columns: {len(columns)}, Data: {expected_cols}")
                                # Re-fetch columns if mismatch
                                table_name = extract_table_name_from_query(sql_query)
                                if table_name:
                                    columns = get_columns_from_table_inspector(db_uri, table_name)
                        
                        output_data = {
                            "type": "select",
                            "data": data,
                            "columns": columns if columns else [f'column_{i}' for i in range(len(data[0])) if data],
                            "row_count": len(data)
                        }
                    else:
                        raise ValueError("Unexpected data format")
                except Exception as e:
                    print(f"Parse error: {e}")
                    output_data = {
                        "type": "error",
                        "message": f"Failed to parse query results: {str(e)}"
                    }
            else:
                output_data = {
                    "type": "error",
                    "message": f"Unexpected result format: {clean_result[:200]}"
                }
        else:
            # Non-SELECT queries
            clean_result = result.strip()
            affected_rows = 0
            
            if 'Query OK' in clean_result or 'rows affected' in clean_result or 'row affected' in clean_result:
                match = re.search(r'(\d+) rows? affected', clean_result)
                affected_rows = int(match.group(1)) if match else 0
                message = f"Statement executed successfully. {affected_rows} row{'s' if affected_rows != 1 else ''} affected."
            else:
                message = clean_result or "Statement executed successfully."
            
            output_data = {
                "type": "status",
                "message": message,
                "affected_rows": affected_rows
            }
        
        return f"SQL: `{sql_query}`\nOutput: {json.dumps(output_data)}"
    
    except Exception as e:
        error_data = {
            "type": "error",
            "message": str(e)
        }
        sql_query_placeholder = sql_query if 'sql_query' in locals() else 'N/A'
        return f"SQL: `{sql_query_placeholder}`\nOutput: {json.dumps(error_data)}"

# API Endpoints

@app.post("/api/send-otp")
async def send_otp_for_signup(request: OtpRequest):
    """Send OTP via Email"""
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    otp_storage[request.email] = {"otp": otp, "expires_at": expires_at}
    
    print(f"[OTP] Attempting to send email to {request.email}...")
    email_sent = send_otp_email(request.email, otp)
    
    if email_sent:
        message = "OTP has been sent to your email."
    else:
        message = "Email sending unavailable; check server logs for OTP."
    
    print(f"[OTP] Generated OTP for {request.email}: {otp}")
    print(f"[OTP] Result: {message}\n")
    
    return {"success": True, "message": message}

@app.post("/api/signup", status_code=201)
async def signup_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    stored_otp_data = otp_storage.get(user.email)
    
    if not stored_otp_data:
        raise HTTPException(status_code=400, detail="OTP not requested or expired.")
    
    if datetime.now(timezone.utc) > stored_otp_data["expires_at"]:
        del otp_storage[user.email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    if stored_otp_data["otp"] != user.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP provided.")
    
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.phone:
        existing_phone = db.query(User).filter(User.phone == user.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        phone=user.phone,
        firstName=user.firstName,
        lastName=user.lastName,
        gender=user.gender,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    del otp_storage[user.email]
    
    return {"success": True, "message": "User created successfully"}

@app.post("/api/login")
async def login_for_access_token(form_data: UserLogin, db: Session = Depends(get_db)):
    """Login with email or username"""
    user = get_user(form_data.identifier, db)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email/username or password")
    
    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "firstName": user.firstName,
            "lastName": user.lastName,
            "username": user.username,
            "gender": user.gender
        }
    }

@app.post("/api/connect")
async def connect_db(config: DBConfig):
    print(f"Received connect request: host={config.host}, port={config.port}, user={config.user}, database={config.database}")
    try:
        db_uri = f"mysql+mysqlconnector://{config.user}:{config.password}@{config.host}:{config.port}/{config.database}"
        test_db = SQLDatabase.from_uri(db_uri)
        test_db.get_table_info()
        
        app.state.db_uri = db_uri
        print("Database connection successful")
        return {"success": True, "message": "Database connected successfully"}
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Database connection failed: {str(e)}")

@app.post("/api/disconnect")
async def disconnect_db():
    """Disconnect from database"""
    if hasattr(app.state, "db_uri"):
        delattr(app.state, "db_uri")
        return {"success": True, "message": "Database disconnected successfully"}
    return {"success": False, "message": "No database connection to disconnect"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not hasattr(app.state, "db_uri"):
        raise HTTPException(status_code=400, detail="Database not connected")
    
    chat_history = [
        AIMessage(content=msg["content"]) if msg["role"] == "ai"
        else HumanMessage(content=msg["content"])
        for msg in request.chat_history
    ]
    
    try:
        db = SQLDatabase.from_uri(app.state.db_uri)
        response = get_response(request.question, db, chat_history, app.state.db_uri)
        return {"success": True, "response": response}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/api/chat-sessions")
async def get_chat_sessions(user_id: int = Query(...)):
    db_session = SessionLocal()
    try:
        sessions = db_session.query(ChatSession).filter(ChatSession.user_id == user_id).all()
        result = []
        for session in sessions:
            result.append({
                "id": session.id,
                "title": session.title,
                "messages": json.loads(session.messages),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        return result
    finally:
        db_session.close()

@app.post("/api/chat-sessions")
async def create_chat_session(session: dict):
    db_session = SessionLocal()
    try:
        new_session = ChatSession(
            user_id=session.get("user_id"),
            title=session.get("title", "Untitled Chat"),
            messages=json.dumps(session.get("messages", []))
        )
        db_session.add(new_session)
        db_session.commit()
        db_session.refresh(new_session)
        return {
            "id": new_session.id,
            "title": new_session.title,
            "messages": json.loads(new_session.messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")
    finally:
        db_session.close()

@app.put("/api/chat-sessions/{session_id}")
async def update_chat_session(session_id: int, session: dict):
    db_session = SessionLocal()
    try:
        existing_session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not existing_session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if existing_session.user_id != session.get("user_id"):
            raise HTTPException(status_code=403, detail="Unauthorized to update this session")
        
        existing_session.title = session.get("title", existing_session.title)
        existing_session.messages = json.dumps(session.get("messages", json.loads(existing_session.messages)))
        db_session.commit()
        
        return {
            "id": existing_session.id,
            "title": existing_session.title,
            "messages": json.loads(existing_session.messages),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update chat session: {str(e)}")
    finally:
        db_session.close()

@app.delete("/api/chat-sessions/{session_id}")
async def delete_chat_session(session_id: int, user_id: int = Query(...)):
    db_session = SessionLocal()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this session")
        
        db_session.delete(session)
        db_session.commit()
        return {"success": True, "message": "Chat session deleted"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete chat session: {str(e)}")
    finally:
        db_session.close()

@app.post("/api/confirm-sql")
async def confirm_sql_action(req: ConfirmSQLRequest):
    if not req.confirm:
        return {
            "type": "status",
            "message": "SQL execution cancelled by user"
        }
    
    try:
        if not hasattr(app.state, "db_uri"):
            raise HTTPException(status_code=400, detail="Database not connected")
        
        db = SQLDatabase.from_uri(app.state.db_uri)
        result = db.run(req.sql)
        
        return {
            "type": "status",
            "message": f"SQL executed successfully. Result: {result}"
        }
    except Exception as e:
        return {
            "type": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)