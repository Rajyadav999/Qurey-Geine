import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

const LoginForm = ({ onSwitchToSignup }: LoginFormProps) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Username or email is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const success = await login(formData);
      if (success) {
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid credentials. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Username/Email Field */}
        <div className="space-y-2">
          <Label htmlFor="identifier" className="text-label">Username or Email</Label>
          <Input
            id="identifier"
            type="text"
            value={formData.identifier}
            onChange={(e) => handleInputChange('identifier', e.target.value)}
            placeholder="Enter username or email"
            className={`focus-brand ${errors.identifier ? 'border-destructive' : ''}`}
            disabled={isLoading}
          />
          {errors.identifier && (
            <p className="text-sm text-destructive animate-in">{errors.identifier}</p>
          )}
        </div>

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
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full gradient-brand hover:shadow-brand transition-all duration-200"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing In...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </>
        )}
      </Button>

      {/* Switch to Signup */}
      <div className="text-center">
        <p className="text-caption">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
            disabled={isLoading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;
