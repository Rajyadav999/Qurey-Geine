import { useState } from 'react';
import { Menu, Database, MessageSquare, MoreVertical, Upload, Trash2, Plus, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface ChatSession {
  id: string;
  title: string;
  timestamp: string | number | Date; // ✅ Accept multiple formats
  messages: Array<{
    id: string;
    content: string;
    type: 'user' | 'assistant' | 'error';
    timestamp: Date;
  }>;
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isConnected: boolean;
  onConnect: (connectionData: any) => void;
  onNewChat: () => void;
  chatHistory: ChatSession[];
  onOpenModal: () => void;
  onChatSelect: (chatId: string) => void;
  currentChatId: string | null;
  onDeleteChat: (chatId: string) => void;
  onDisconnect: () => void;
}

// ✅ ADD: Timestamp formatting function
const formatTimestamp = (timestamp: string | number | Date): string => {
  // If it's already a formatted string like "2 hours ago", return it
  if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp.includes('now'))) {
    return timestamp;
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    // For very old chats, show the actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
};

// Mock chat history data
const mockChatHistory = [
  { id: '1', title: 'User analytics query', timestamp: '2 hours ago', preview: 'Show me users who signed up last month' },
  { id: '2', title: 'Product sales data', timestamp: '1 day ago', preview: 'Get total sales for each product category' },
  { id: '3', title: 'Performance metrics', timestamp: '2 days ago', preview: 'Find slowest queries in the database' },
  { id: '4', title: 'Customer segments', timestamp: '3 days ago', preview: 'Group customers by purchase behavior' },
  { id: '5', title: 'Revenue analysis', timestamp: '1 week ago', preview: 'Calculate monthly recurring revenue' },
];

const Sidebar = ({ isCollapsed, onToggleCollapse, isConnected, onConnect, onNewChat, chatHistory, onOpenModal, onChatSelect, currentChatId, onDeleteChat, onDisconnect }: SidebarProps) => {
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [connectionForm, setConnectionForm] = useState({
    host: '',
    username: '',
    password: '',
    database: ''
  });
  const [localChatHistory, setLocalChatHistory] = useState(mockChatHistory);
  const { toast } = useToast();

  const handleConnect = () => {
    if (selectedDataSource === 'mysql' || selectedDataSource === 'postgresql') {
      if (!connectionForm.host || !connectionForm.username || !connectionForm.password || !connectionForm.database) {
        toast({
          title: "Connection Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
    }
    
    onConnect({ 
      type: selectedDataSource, 
      ...connectionForm 
    });
    
    toast({
      title: "Connected Successfully",
      description: `Connected to ${selectedDataSource.toUpperCase()}`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onConnect({ 
        type: 'excel', 
        file: file.name 
      });
      
      toast({
        title: "File Uploaded",
        description: `Excel file "${file.name}" uploaded successfully`,
      });
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(chatId);
    toast({
      title: "Chat Deleted",
      description: "Chat history has been removed",
    });
  };


  return (
    <div className={`relative h-full bg-surface-elevated border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-end p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-2 hover:bg-muted"
          >
            <Menu size={18} />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed && (
            <>
              {/* Connection Status */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
                  <span className="text-muted-foreground">
                    {isConnected ? 'Database Connected' : 'No Connection'}
                  </span>
                </div>
              </div>

              {/* Data Source Connection Button (if not connected) */}
              {!isConnected && (
                <div className="p-3 border-b border-border">
                  <Button onClick={onOpenModal} size="sm" className="w-full h-8 text-xs">
                    <Database size={14} className="mr-2" />
                    Connect Database
                  </Button>
                </div>
              )}

              {/* Switch Database and Disconnect options (when connected) */}
              {isConnected && (
                <div className="p-3 border-b border-border space-y-2">
                  <Button onClick={onOpenModal} variant="outline" size="sm" className="w-full h-8 text-xs">
                    <RefreshCw size={14} className="mr-2" />
                    Switch Database
                  </Button>
                  <Button onClick={onDisconnect} variant="outline" size="sm" className="w-full h-8 text-xs text-destructive hover:text-destructive">
                    <Unplug size={14} className="mr-2" />
                    Disconnect
                  </Button>
                </div>
              )}

              {/* Chat History */}
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="text-xs font-medium text-muted-foreground">Chat History</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onNewChat}
                        className="h-6 w-6 p-0 text-xs hover:bg-muted"
                      >
                        <Plus size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>New Chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <ScrollArea className="flex-1 px-2">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare size={20} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-2">No conversations yet</h3>
                    <p className="text-xs text-muted-foreground">Start a chat to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {chatHistory.map((chat) => (
                      <div
                        key={chat.id}
                        className={`relative group rounded-lg transition-all duration-200 hover:bg-muted ${
                          currentChatId === chat.id ? 'bg-brand-50 border-l-2 border-brand-500' : ''
                        }`}
                      >
                        <button
                          onClick={() => onChatSelect(chat.id)}
                          className="w-full text-left p-2"
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare 
                              size={12} 
                              className={`mt-1 flex-shrink-0 ${
                                currentChatId === chat.id ? 'text-brand-600' : 'text-muted-foreground'
                              }`} 
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-xs truncate ${
                                currentChatId === chat.id ? 'text-brand-700' : 'text-foreground'
                              }`}>
                                {chat.title}
                              </h4>
                              {/* ✅ UPDATED: Use formatTimestamp function */}
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {formatTimestamp(chat.timestamp)}
                              </p>
                            </div>
                          </div>
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-5 w-5"
                            >
                              <MoreVertical size={10} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                              className="text-destructive text-xs"
                            >
                              <Trash2 size={10} className="mr-1" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;