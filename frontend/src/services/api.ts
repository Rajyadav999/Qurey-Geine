// src/services/api.ts
import axios from 'axios';

// Create an axios instance with the base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ---- TYPE DEFINITIONS ----
// These should match your FastAPI Pydantic models

// Matches the DBConfig model in Python
export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string; // Optional as it has a default in Python
  database: string;
}

// Represents a single message in the chat history
export interface ChatMessage {
  role: 'ai' | 'user'; // 'ai' for AIMessage, 'user' for HumanMessage
  content: string;
}

// Matches the ChatRequest model in Python
export interface ChatRequestPayload {
  question: string;
  chat_history: ChatMessage[];
}

// Auth types
// ✅ UPDATED: Changed contactNumber to phone
export interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;  // ✅ CHANGED: contactNumber → phone
  gender: string;
  email: string;
  password: string;
  otp: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

// ✅ UPDATED: OtpRequest now supports both email and phone
export interface OtpRequest {
  email?: string;
  phone?: string;
}

// ✅ UPDATED: Changed contactNumber to phone
export interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  gender: string;
  phone?: string;  // ✅ CHANGED: contactNumber → phone
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: UserData;
}

export interface SignupResponse {
  success: boolean;
  message: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
}


// ---- API FUNCTIONS ----

/**
 * Connects to the database.
 * @param config - The database connection details.
 * @returns A promise that resolves with the server's response.
 */
export const connectToDB = async (config: DBConfig) => {
  try {
    const { data } = await api.post('/api/connect', config);
    return data; // Expected: { success: true } or { success: false, error: "..." }
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    throw error;
  }
};

/**
 * Sends a message to the chat endpoint.
 * @param payload - The question and chat history.
 * @returns A promise that resolves with the AI's response.
 */
export const sendChatMessage = async (payload: ChatRequestPayload) => {
  try {
    const { data } = await api.post('/api/chat', payload);
    return data; // Expected: { success: true, response: "..." } or { success: false, error: "..." }
  } catch (error) {
    console.error("Failed to send chat message:", error);
    throw error;
  }
};

/**
 * Sends OTP to the user's email or phone for signup verification.
 * @param request - The email and/or phone to send OTP to.
 * @returns A promise that resolves with the server's response.
 */
export const sendOtp = async (request: OtpRequest): Promise<OtpResponse> => {
  try {
    const { data } = await api.post('/api/send-otp', request);
    return data;
  } catch (error) {
    console.error("Failed to send OTP:", error);
    throw error;
  }
};

/**
 * Signs up a new user.
 * @param userData - The user signup data including OTP.
 * @returns A promise that resolves with the signup response.
 */
export const signup = async (userData: SignupData): Promise<SignupResponse> => {
  try {
    const { data } = await api.post('/api/signup', userData);
    return data;
  } catch (error) {
    console.error("Failed to signup:", error);
    throw error;
  }
};

/**
 * Logs in a user.
 * @param credentials - The login credentials (identifier and password).
 * @returns A promise that resolves with the login response including user data.
 */
export const login = async (credentials: LoginData): Promise<LoginResponse> => {
  try {
    const { data } = await api.post('/api/login', credentials);
    return data;
  } catch (error) {
    console.error("Failed to login:", error);
    throw error;
  }
};