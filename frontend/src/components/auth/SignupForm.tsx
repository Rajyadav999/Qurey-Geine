import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Loader2, Mail, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const SignupForm = ({ onSwitchToLogin }: SignupFormProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',  
    phone: '',  
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const { signup, isLoading } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!/^[A-Za-z]+$/.test(formData.firstName)) {
      newErrors.firstName = 'Must contain only letters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!/^[A-Za-z]+$/.test(formData.lastName)) {
      newErrors.lastName = 'Must contain only letters';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[A-Za-z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Only letters, numbers, and underscores';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // ✅ UPDATED: Validate phone number format
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{9,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Must be a valid phone number (e.g., +919876543210)';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Must be a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (otpSent && !formData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (otpSent && !/^\d{6}$/.test(formData.otp)) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ✅ UPDATED: Format phone number to E.164 format
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    
    if (phone.startsWith('+')) {
      return phone.replace(/\s/g, '');
    }
    
    
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    
    
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
    
    return phone;
  };

  const handleSendOtp = async () => {
    // ✅ UPDATED: Validate both email and phone
    if (errors.email || !formData.email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Must be a valid email address' }));
      return;
    }

    if (errors.phone || !formData.phone.trim()) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }

    setIsSendingOtp(true);
    try {
      const apiUrl = `http://localhost:8000/api/send-otp`;
      const formattedPhone = formatPhoneNumber(formData.phone);
      
     
      const response = await axios.post(apiUrl, { 
        email: formData.email,
        phone: formattedPhone
      });
      
      if (response.data.success) {
        setOtpSent(true);
        
        setFormData(prev => ({ ...prev, phone: formattedPhone }));
        toast({
          title: "OTP Sent!",
          description: response.data.message || "Please check your phone/email for the verification code.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.response?.data?.detail || "An unexpected error occurred.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  try {
    const formattedData = {
      ...formData,
      phone: formatPhoneNumber(formData.phone)
    };
    
    const success = await signup(formattedData);
    if (success) {
      toast({
        title: "Account created!",
        description: "Welcome! You have been automatically signed in.",
      });
    }
  } catch (error: any) {
    // ✅ IMPROVED: Extract and display specific backend error
    let errorMessage = "An unexpected error occurred. Please try again.";
    let errorTitle = "Signup Failed";
    
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail.toLowerCase();
      
      // Check for specific field errors
      if (detail.includes('email')) {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
        errorTitle = "Email Already Exists";
        // Highlight the email field
        setErrors(prev => ({ ...prev, email: 'Email already registered' }));
      } else if (detail.includes('username')) {
        errorMessage = "This username is already taken. Please choose a different username.";
        errorTitle = "Username Already Taken";
        // Highlight the username field
        setErrors(prev => ({ ...prev, username: 'Username already taken' }));
      } else if (detail.includes('phone')) {
        errorMessage = "This phone number is already registered. Please use a different phone number.";
        errorTitle = "Phone Already Registered";
        // Highlight the phone field
        setErrors(prev => ({ ...prev, phone: 'Phone number already registered' }));
      } else if (detail.includes('otp')) {
        errorMessage = "Invalid or expired OTP. Please request a new OTP and try again.";
        errorTitle = "Invalid OTP";
        // Highlight the OTP field
        setErrors(prev => ({ ...prev, otp: 'Invalid or expired OTP' }));
      } else {
        // Generic error from backend
        errorMessage = error.response.data.detail;
      }
    }
    
    toast({
      variant: "destructive",
      title: errorTitle,
      description: errorMessage,
    });
  }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-label">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter first name"
              className={`focus-brand ${errors.firstName ? 'border-destructive' : ''}`}
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive animate-in">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-label">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter last name"
              className={`focus-brand ${errors.lastName ? 'border-destructive' : ''}`}
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive animate-in">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-label">Username</Label>
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Choose a username"
            className={`focus-brand ${errors.username ? 'border-destructive' : ''}`}
            disabled={isLoading}
          />
          {errors.username && (
            <p className="text-sm text-destructive animate-in">{errors.username}</p>
          )}
        </div>

        {/* ✅ UPDATED: Phone Number Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-label">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+919876543210 or 9876543210"
            className={`focus-brand ${errors.phone ? 'border-destructive' : ''}`}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">Format: +[country code][number]</p>
          {errors.phone && (
            <p className="text-sm text-destructive animate-in">{errors.phone}</p>
          )}
        </div>

        {/* Gender Field */}
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-label">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => handleInputChange('gender', value)}
            disabled={isLoading}
          >
            <SelectTrigger className={`focus-brand ${errors.gender ? 'border-destructive' : ''}`}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-destructive animate-in">{errors.gender}</p>
          )}
        </div>

        {/* Email Field with OTP */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-label">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email"
              className={`focus-brand pr-20 ${errors.email ? 'border-destructive' : ''}`}
              disabled={isLoading || otpSent}
            />
            {!otpSent && (
              <button
                type="button"
                onClick={handleSendOtp}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                disabled={isSendingOtp || isLoading || !!errors.email || !!errors.phone}
              >
                {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail size={16} />}
              </button>
            )}
          </div>
          {errors.email && (
            <p className="text-sm text-destructive animate-in">{errors.email}</p>
          )}
        </div>

        {/* OTP Field (conditional) */}
        {otpSent && (
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-label">Verification Code (OTP)</Label>
            <Input
              id="otp"
              type="text"
              value={formData.otp}
              onChange={(e) => handleInputChange('otp', e.target.value)}
              placeholder="Enter 6-digit OTP"
              className={`focus-brand ${errors.otp ? 'border-destructive' : ''}`}
              disabled={isLoading}
              maxLength={6}
            />
            {errors.otp && (
              <p className="text-sm text-destructive animate-in">{errors.otp}</p>
            )}
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-label">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password"
              className={`focus-brand pr-12 ${errors.password ? 'border-destructive' : ''}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive animate-in">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-label">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm password"
              className={`focus-brand pr-12 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive animate-in">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full gradient-brand hover:shadow-brand transition-all duration-200"
        disabled={isLoading || !otpSent}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account
          </>
        )}
      </Button>

      {/* Switch to Login */}
      <div className="text-center">
        <p className="text-caption">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
            disabled={isLoading}
          >
            Sign In
          </button>
        </p>
      </div>
    </form>
  );
};

export default SignupForm;