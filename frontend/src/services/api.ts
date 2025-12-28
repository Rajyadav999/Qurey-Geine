// src/services/api.ts
// ✅ SIMPLIFIED - No authentication, no tokens!

import axios from 'axios';

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// ============= TYPE DEFINITIONS =============

export interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

export interface ChatRequestPayload {
  question: string;
  chat_history: ChatMessage[];
}

export interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  gender: string;
  email: string;
  password: string;
  otp: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface OtpRequest {
  email?: string;
  phone?: string;
}

export interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  gender: string;
  phone?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: UserData;
  // ✅ REMOVED: No token anymore!
}

export interface SignupResponse {
  success: boolean;
  message: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
}

// ============= API FUNCTIONS =============

/**
 * Connect to database
 */
export const connectToDB = async (config: DBConfig) => {
  try {
    const { data } = await api.post('/api/connect', config);
    return data;
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
export const disconnectFromDB = async () => {
  try {
    const { data } = await api.post('/api/disconnect');
    return data;
  } catch (error) {
    console.error("Failed to disconnect from the database:", error);
    throw error;
  }
};

/**
 * Send chat message
 */
export const sendChatMessage = async (payload: ChatRequestPayload) => {
  try {
    const { data } = await api.post('/api/chat', payload);
    return data;
  } catch (error) {
    console.error("Failed to send chat message:", error);
    throw error;
  }
};

/**
 * Send OTP
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
 * Signup
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
 * Login - ✅ SIMPLIFIED: No token handling!
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

/**
 * Logout - ✅ SIMPLIFIED: Just a placeholder, no backend call needed
 */
export const logout = async (): Promise<void> => {
  // No backend call needed anymore
  return Promise.resolve();
};

/**
 * Get chat sessions
 */
export const getChatSessions = async (userId: number) => {
  try {
    const { data } = await api.get(`/api/chat-sessions?user_id=${userId}`);
    return data;
  } catch (error) {
    console.error("Failed to get chat sessions:", error);
    throw error;
  }
};

/**
 * Create chat session
 */
export const createChatSession = async (userId: number, title: string, messages: ChatMessage[] = []) => {
  try {
    const { data } = await api.post('/api/chat-sessions', {
      user_id: userId,
      title,
      messages
    });
    return data;
  } catch (error) {
    console.error("Failed to create chat session:", error);
    throw error;
  }
};

/**
 * Update chat session
 */
export const updateChatSession = async (sessionId: number, userId: number, title: string, messages: ChatMessage[]) => {
  try {
    const { data } = await api.put(`/api/chat-sessions/${sessionId}`, {
      user_id: userId,
      title,
      messages
    });
    return data;
  } catch (error) {
    console.error("Failed to update chat session:", error);
    throw error;
  }
};

/**
 * Delete chat session
 */
export const deleteChatSession = async (sessionId: number, userId: number) => {
  try {
    const { data } = await api.delete(`/api/chat-sessions/${sessionId}?user_id=${userId}`);
    return data;
  } catch (error) {
    console.error("Failed to delete chat session:", error);
    throw error;
  }
};

/**
 * Confirm SQL execution
 */
export const confirmSQL = async (userId: number, sql: string, confirm: boolean) => {
  try {
    const { data } = await api.post('/api/confirm-sql', {
      user_id: userId,
      sql,
      confirm
    });
    return data;
  } catch (error) {
    console.error("Failed to confirm SQL:", error);
    throw error;
  }
};