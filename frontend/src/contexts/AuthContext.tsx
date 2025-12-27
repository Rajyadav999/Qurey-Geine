import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, signup as apiSignup, sendOtp as apiSendOtp, LoginResponse, SignupResponse } from '@/services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;  // ✅ CHANGED: contactNumber → phone
  gender: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  sendOtp: (email: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  identifier: string;
  password: string;
}

// ✅ UPDATED: SignupData interface
interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;  // ✅ CHANGED: contactNumber → phone
  gender: string;
  email: string;
  password: string;
  otp: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const savedUser = localStorage.getItem('query-genie-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('query-genie-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response: LoginResponse = await apiLogin(credentials);
      
      if (response.success && response.user) {
        const userData: User = {
          id: response.user.id.toString(),
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          username: response.user.username,
          email: response.user.email,
          phone: response.user.phone || '',  // ✅ CHANGED: contactNumber → phone
          gender: response.user.gender
        };

        setUser(userData);
        localStorage.setItem('query-genie-user', JSON.stringify(userData));
        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // ✅ UPDATED: signup function with better error handling
const signup = async (userData: SignupData): Promise<boolean> => {
  setIsLoading(true);
  try {
    const response: SignupResponse = await apiSignup({
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      phone: userData.phone,
      gender: userData.gender,
      email: userData.email,
      password: userData.password,
      otp: userData.otp
    });

    if (response.success) {
      // After successful signup, automatically log in the user
      const loginSuccess = await login({
        identifier: userData.email,
        password: userData.password
      });
      
      setIsLoading(false);
      return loginSuccess;
    } else {
      setIsLoading(false);
      return false;
    }
  } catch (error) {
    console.error('Signup failed:', error);
    setIsLoading(false);
    throw error; // ✅ ADDED: Throw error so SignupForm can catch it
  }
};

  const sendOtp = async (email: string): Promise<boolean> => {
    try {
      const response = await apiSendOtp({ email });
      return response.success;
    } catch (error) {
      console.error('Send OTP failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('query-genie-user');
  };

  const value = {
    user,
    login,
    signup,
    sendOtp,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};