import { useState } from 'react';
import { Menu, Database, MessageSquare, MoreVertical, Trash2, Plus, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const API_BASE = "http://localhost:8000";

interface ChatSession {
  id: string;
  user_id?: number;
  title: string;
  timestamp: string | number | Date;
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
  userId: number | null;
  isLoadingHistory?: boolean;
}

const formatTimestamp = (timestamp: string | number | Date): string => {
  // Handle invalid timestamps
  if (!timestamp) {
    return 'Just now';
  }

  // If it's already a formatted string (from old data), return it
  if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp.includes('now'))) {
    return timestamp;
  }

  try {
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Just now';
    }

    // Format: YYYY-MM-DDTHH:MM:SS.sssZ
    return date.toISOString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return new Date().toISOString();
  }
};

const Sidebar = ({ 
  isCollapsed, 
  onToggleCollapse, 
  isConnected, 
  onConnect, 
  onNewChat, 
  chatHistory = [], 
  onOpenModal, 
  onChatSelect, 
  currentChatId, 
  onDeleteChat, 
  onDisconnect,
  userId,
  isLoadingHistory = false
}: SidebarProps) => {
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  
  // Ensure chatHistory is always an array
  const safeHistory = Array.isArray(chatHistory) ? chatHistory : [];

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    const chatExists = safeHistory.find(chat => chat?.id === chatId);
    if (!chatExists) {
      console.error('[SIDEBAR] Chat not found in local state:', chatId);
      return;
    }

    setDeletingChatId(chatId);

    try {
      console.log(`[SIDEBAR] Deleting chat ${chatId} for user ${userId}`);
      
      const response = await fetch(
        `${API_BASE}/api/chat-sessions/${chatId}?user_id=${userId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log(`[SIDEBAR] Successfully deleted chat ${chatId}`);
        onDeleteChat(chatId);
      } else {
        if (response.status === 404) {
          console.warn(`[SIDEBAR] Chat ${chatId} not found (404), removing from UI`);
          onDeleteChat(chatId);
        } else if (response.status === 403) {
          console.error('Permission denied');
        } else {
          console.error(`[SIDEBAR] Delete failed with status ${response.status}`);
          onDeleteChat(chatId);
        }
      }
    } catch (error: any) {
      console.error('[SIDEBAR] Delete error:', error);
      onDeleteChat(chatId);
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <div className={`relative h-full bg-surface-elevated border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
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

        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed && (
            <>
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
                  <span className="text-muted-foreground">
                    {isConnected ? 'Database Connected' : 'No Connection'}
                  </span>
                </div>
              </div>

              {!isConnected ? (
                <div className="p-3 border-b border-border">
                  <Button onClick={onOpenModal} size="sm" className="w-full h-8 text-xs">
                    <Database size={14} className="mr-2" />
                    Connect Database
                  </Button>
                </div>
              ) : (
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
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                  </div>
                ) : safeHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare size={20} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-2">No conversations yet</h3>
                    <p className="text-xs text-muted-foreground">Start a chat to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {safeHistory.map((chat) => (
                      <div
                        key={chat.id}
                        className={`group relative rounded-lg transition-all duration-200 ${
                          currentChatId === chat.id ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-muted'
                        } ${deletingChatId === chat.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center">
                          <button
                            onClick={() => onChatSelect(chat.id)}
                            disabled={deletingChatId === chat.id}
                            className="flex-1 text-left p-2"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare 
                                size={12} 
                                className={`mt-1 flex-shrink-0 ${
                                  currentChatId === chat.id ? 'text-brand-600' : 'text-muted-foreground'
                                }`} 
                              />
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className={`font-medium text-xs truncate ${
                                  currentChatId === chat.id ? 'text-brand-700' : 'text-foreground'
                                }`}>
                                  {chat.title}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                                  {formatTimestamp(chat.timestamp)}
                                </p>
                              </div>
                            </div>
                          </button>
                          
                          {/* Three-dot menu appears on hover */}
                          <div className="flex-shrink-0 pr-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingChatId === chat.id}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-opacity"
                                >
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => handleDeleteChat(chat.id, e)}
                                  disabled={deletingChatId === chat.id}
                                  className="text-destructive text-sm cursor-pointer"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  {deletingChatId === chat.id ? 'Deleting...' : 'Delete'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
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