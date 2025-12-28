import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, signup as apiSignup, sendOtp as apiSendOtp, LoginResponse, SignupResponse } from '@/services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
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

interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  gender: string;
  email: string;
  password: string;
  otp: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ FIX: Load user from localStorage on mount (persist across reloads)
  useEffect(() => {
    console.log('[AUTH] Initializing AuthContext...');
    const savedUser = localStorage.getItem('query-genie-user');
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('[AUTH] Found stored user:', parsedUser.id);
        setUser(parsedUser);
      } catch (error) {
        console.error('[AUTH] Failed to parse saved user:', error);
        localStorage.removeItem('query-genie-user');
      }
    } else {
      console.log('[AUTH] No stored user found');
    }
    setIsLoading(false);
  }, []);

  // ✅ FIX: Save user to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        console.log('[AUTH] Saving user to localStorage:', user.id);
        localStorage.setItem('query-genie-user', JSON.stringify(user));
      } else {
        console.log('[AUTH] Removing user from localStorage');
        localStorage.removeItem('query-genie-user');
      }
    }
  }, [user, isLoading]);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    console.log('[AUTH] Login attempt for:', credentials.identifier);
    setIsLoading(true);
    
    try {
      const response: LoginResponse = await apiLogin(credentials);
      
      if (response.success && response.user) {
        console.log('[AUTH] Login successful for user:', response.user.id);
        
        const userData: User = {
          id: response.user.id.toString(),
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          username: response.user.username,
          email: response.user.email,
          phone: response.user.phone || '',
          gender: response.user.gender
        };

        setUser(userData);
        setIsLoading(false);
        
        // Navigate to dashboard after successful login
        navigate('/dashboard');
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

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
        // After successful signup, automatically log in
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
      console.error('[AUTH] Signup failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const sendOtp = async (email: string): Promise<boolean> => {
    try {
      const response = await apiSendOtp({ email });
      return response.success;
    } catch (error) {
      console.error('[AUTH] Send OTP failed:', error);
      return false;
    }
  };

  // ✅ FIX: Clear everything on logout and navigate to home
  const logout = () => {
    console.log('[AUTH] Logout called');
    setUser(null);
    localStorage.removeItem('query-genie-user');
    navigate('/');
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