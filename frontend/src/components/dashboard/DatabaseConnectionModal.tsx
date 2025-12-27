import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = "http://localhost:8000";

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (data: any) => void;  // ✅ Changed from onConnectSuccess
}

interface ConnectionFormData {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
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
  const { toast } = useToast();

  const handleInputChange = (field: keyof ConnectionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    // Validate required fields
    if (!formData.host.trim() || !formData.user.trim() || !formData.database.trim()) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in Host, Username, and Database Name",
      });
      return;
    }

    setIsConnecting(true);

    const payload = {
      host: formData.host,
      port: parseInt(formData.port, 10),
      user: formData.user,
      password: formData.password,
      database: formData.database,
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
          title: "✅ Connection successful!",
          description: `Connected to the ${formData.database} database.`,
        });
        
        // ✅ Pass the connection data to parent
        onConnect({
          type: 'mysql',
          ...formData
        });
        
        onClose();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      console.error("Connection failed:", error);
      toast({
        variant: "destructive",
        title: "❌ Connection Failed",
        description: error.message || 'Check credentials and backend server.',
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection
          </DialogTitle>
          <DialogDescription>
            Connect to your database to start querying.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input 
              id="host" 
              value={formData.host} 
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="127.0.0.1"
              disabled={isConnecting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input 
              id="port" 
              value={formData.port} 
              onChange={(e) => handleInputChange('port', e.target.value)}
              placeholder="3306"
              disabled={isConnecting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <Input 
              id="user" 
              value={formData.user} 
              onChange={(e) => handleInputChange('user', e.target.value)}
              placeholder="root"
              disabled={isConnecting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={formData.password} 
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="••••••••"
              disabled={isConnecting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input 
              id="database" 
              value={formData.database} 
              onChange={(e) => handleInputChange('database', e.target.value)}
              placeholder="employees"
              disabled={isConnecting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
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