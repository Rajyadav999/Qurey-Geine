import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Database, Loader2, CheckCircle, AlertCircle, Lightbulb, XCircle, WifiOff, Lock, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_BASE = "http://localhost:8000";

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (data: any) => void;
}

interface ConnectionFormData {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

interface ConnectionError {
  success?: boolean;
  error: string;
  message: string;
  suggestion?: string;
  code: string;
}

export const DatabaseConnectionModal = ({ isOpen, onClose, onConnect }: DatabaseConnectionModalProps) => {
  const [formData, setFormData] = useState<ConnectionFormData>({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',
    database: '',
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ConnectionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (connectionError) {
      setConnectionError(null);
    }
  };

  const handleConnect = async () => {
    // Validate required fields
    if (!formData.host.trim()) {
      toast({
        variant: "destructive",
        title: "Host Required",
        description: "Please enter the database host (e.g., localhost or 127.0.0.1)",
      });
      return;
    }

    if (!formData.user.trim()) {
      toast({
        variant: "destructive",
        title: "Username Required",
        description: "Please enter your database username",
      });
      return;
    }

    if (!formData.database.trim()) {
      toast({
        variant: "destructive",
        title: "Database Name Required",
        description: "Please enter the name of the database you want to connect to",
      });
      return;
    }

    // Validate port is a number
    const portNum = parseInt(formData.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast({
        variant: "destructive",
        title: "Invalid Port",
        description: "Port must be a number between 1 and 65535",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const payload = {
      host: formData.host.trim(),
      port: portNum,
      user: formData.user.trim(),
      password: formData.password,
      database: formData.database.trim(),
    };

    try {
      const response = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "✅ Connection Successful!",
          description: `Connected to ${formData.database} database successfully.`,
          duration: 5000,
        });
        
        onConnect({
          type: 'mysql',
          ...formData
        });
        
        setConnectionError(null);
        onClose();
      } else {
        // Handle structured error response from backend
        if (result.detail && typeof result.detail === 'object') {
          setConnectionError(result.detail);
          
          // Show toast for critical errors
          if (result.detail.code === 'AUTH_FAILED') {
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "Please check your username and password",
            });
          }
        } else {
          // Fallback for unstructured errors
          setConnectionError({
            error: "Connection Error",
            message: result.detail || result.message || 'An unknown error occurred.',
            code: "UNKNOWN_ERROR"
          });
        }
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      
      // Network error - backend not reachable
      setConnectionError({
        error: "Network Error",
        message: "Unable to reach the backend server. Please ensure the server is running on port 8000.",
        suggestion: "Start the backend server using: python main.py",
        code: "NETWORK_ERROR"
      });
      
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Cannot connect to backend server",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Get appropriate icon based on error code
  const getErrorIcon = () => {
    if (!connectionError) return null;
    
    switch (connectionError.code) {
      case 'DATABASE_NOT_FOUND':
        return <Database className="h-5 w-5" />;
      case 'AUTH_FAILED':
        return <Lock className="h-5 w-5" />;
      case 'CONNECTION_REFUSED':
        return <Server className="h-5 w-5" />;
      case 'CONNECTION_TIMEOUT':
        return <WifiOff className="h-5 w-5" />;
      case 'HOST_NOT_FOUND':
        return <XCircle className="h-5 w-5" />;
      case 'NETWORK_ERROR':
        return <WifiOff className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Get appropriate variant based on error severity
  const getErrorVariant = (): "default" | "destructive" => {
    if (!connectionError) return "default";
    
    switch (connectionError.code) {
      case 'DATABASE_NOT_FOUND':
      case 'HOST_NOT_FOUND':
        return "default"; // Info/warning style
      case 'AUTH_FAILED':
      case 'CONNECTION_REFUSED':
      case 'CONNECTION_TIMEOUT':
      case 'NETWORK_ERROR':
      case 'UNKNOWN_ERROR':
      default:
        return "destructive"; // Error style
    }
  };

  // Get error title with emoji
  const getErrorTitle = () => {
    if (!connectionError) return "";
    
    switch (connectionError.code) {
      case 'DATABASE_NOT_FOUND':
        return "🗄️ " + connectionError.error;
      case 'AUTH_FAILED':
        return "🔐 " + connectionError.error;
      case 'CONNECTION_REFUSED':
        return "🚫 " + connectionError.error;
      case 'CONNECTION_TIMEOUT':
        return "⏱️ " + connectionError.error;
      case 'HOST_NOT_FOUND':
        return "🌐 " + connectionError.error;
      case 'NETWORK_ERROR':
        return "📡 " + connectionError.error;
      default:
        return "⚠️ " + connectionError.error;
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleConnect();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Database Connection
          </DialogTitle>
          <DialogDescription>
            Connect to your MySQL database to start querying with natural language.
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {connectionError && (
          <Alert variant={getErrorVariant()} className="animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              {getErrorIcon()}
              <div className="flex-1 space-y-1">
                <AlertTitle className="text-base font-semibold">
                  {getErrorTitle()}
                </AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  {connectionError.message}
                </AlertDescription>
                
                {/* Suggestion Box */}
                {connectionError.suggestion && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in-50">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                          💡 Solution:
                        </p>
                        <code className="text-xs text-blue-800 dark:text-blue-200 block bg-blue-100 dark:bg-blue-900 p-2 rounded border border-blue-200 dark:border-blue-700 font-mono whitespace-pre-wrap break-all">
                          {connectionError.suggestion}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Connection Form */}
        <div className="space-y-4 py-2" onKeyPress={handleKeyPress}>
          <div className="space-y-2">
            <Label htmlFor="host" className="flex items-center gap-1">
              Host <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="host" 
              value={formData.host} 
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="127.0.0.1 or localhost"
              disabled={isConnecting}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Server address where MySQL is running
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="port" className="flex items-center gap-1">
              Port <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="port" 
              value={formData.port} 
              onChange={(e) => handleInputChange('port', e.target.value)}
              placeholder="3306"
              disabled={isConnecting}
              className="font-mono"
              type="number"
              min="1"
              max="65535"
            />
            <p className="text-xs text-muted-foreground">
              MySQL server port (default: 3306)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="user" className="flex items-center gap-1">
              Username <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="user" 
              value={formData.user} 
              onChange={(e) => handleInputChange('user', e.target.value)}
              placeholder="root"
              disabled={isConnecting}
              className="font-mono"
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground">
              Database username for authentication
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={formData.password} 
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password (if any)"
              disabled={isConnecting}
              autoComplete="current-password"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if no password is set
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="database" className="flex items-center gap-1">
              Database Name <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="database" 
              value={formData.database} 
              onChange={(e) => handleInputChange('database', e.target.value)}
              placeholder="my_database"
              disabled={isConnecting}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Name of the database you want to query
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="min-w-[120px]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};