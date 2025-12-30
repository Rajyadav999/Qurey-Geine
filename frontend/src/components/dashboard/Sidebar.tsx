import { useState } from 'react';
import { Menu, Database, MessageSquare, MoreVertical, Trash2, Plus, RefreshCw, Unplug, Star, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

const API_BASE = "http://localhost:8000";

interface ChatSession {
  id: string;
  user_id?: number;
  title: string;
  timestamp: string | number | Date;
  isStarred?: boolean;
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
  onRenameChat?: (chatId: string, newTitle: string) => void;
}

const formatTimestamp = (timestamp: string | number | Date): string => {
  if (!timestamp) {
    return 'Just now';
  }

  if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp.includes('now'))) {
    return timestamp;
  }

  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Just now';
    }

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
  isLoadingHistory = false,
  onRenameChat
}: SidebarProps) => {
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [starredChats, setStarredChats] = useState<Set<string>>(new Set());
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  
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

  const handleStarToggle = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleRenameClick = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleRenameSubmit = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      setEditingTitle('');
      return;
    }

    if (!userId) {
      console.error('[SIDEBAR] User not authenticated');
      setEditingChatId(null);
      setEditingTitle('');
      return;
    }

    const currentChat = safeHistory.find(chat => chat.id === chatId);
    if (currentChat && currentChat.title === editingTitle.trim()) {
      setEditingChatId(null);
      setEditingTitle('');
      return;
    }

    setIsRenaming(true);

    try {
      console.log(`[SIDEBAR] Renaming chat ${chatId} to "${editingTitle.trim()}"`);
      
      if (onRenameChat) {
        onRenameChat(chatId, editingTitle.trim());
      }
      
      setEditingChatId(null);
      setEditingTitle('');
      
    } catch (error) {
      console.error('[SIDEBAR] Rename error:', error);
      setEditingChatId(null);
      setEditingTitle('');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
      setEditingTitle('');
    }
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const starredChatsList = safeHistory.filter(chat => starredChats.has(chat.id));
  const regularChatsList = safeHistory.filter(chat => !starredChats.has(chat.id));

  const renderChatItem = (chat: ChatSession) => {
    const isStarred = starredChats.has(chat.id);
    const isEditing = editingChatId === chat.id;

    return (
      <div
        key={chat.id}
        className={`group relative rounded-lg mb-1 ${
          currentChatId === chat.id ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-muted'
        } ${deletingChatId === chat.id ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div
            onClick={() => !isEditing && onChatSelect(chat.id)}
            className="flex-1 cursor-pointer p-2"
          >
            <div className="flex items-start gap-2">
              <MessageSquare 
                size={12} 
                className={`mt-1 flex-shrink-0 ${
                  currentChatId === chat.id ? 'text-brand-600' : 'text-muted-foreground'
                }`} 
              />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1.5 w-full pr-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                      className="h-7 text-xs px-2 py-1 w-full"
                      autoFocus
                      disabled={isRenaming}
                      placeholder="Enter chat title..."
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameSubmit(chat.id);
                        }}
                        disabled={isRenaming || !editingTitle.trim()}
                        className="h-6 text-[11px] px-3 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRenaming ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameCancel();
                        }}
                        disabled={isRenaming}
                        className="h-6 text-[11px] px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      {isStarred && (
                        <Star 
                          size={10} 
                          className="text-yellow-500 fill-yellow-500 flex-shrink-0" 
                        />
                      )}
                      <h4 className={`font-medium text-xs truncate ${
                        currentChatId === chat.id ? 'text-brand-700' : 'text-foreground'
                      }`}>
                        {chat.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                      {formatTimestamp(chat.timestamp)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Three-dot menu - appears on hover */}
          {!isEditing && (
            <div className="flex-shrink-0 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => handleStarToggle(chat.id, e)}
                    className="text-sm cursor-pointer"
                  >
                    <Star 
                      size={14} 
                      className={`mr-2 ${isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`}
                    />
                    {isStarred ? 'Unstar' : 'Star'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleRenameClick(chat, e)}
                    className="text-sm cursor-pointer"
                  >
                    <Edit2 size={14} className="mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
          )}
        </div>
      </div>
    );
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
                    {starredChatsList.length > 0 && (
                      <>
                        <div className="px-2 py-1">
                          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Starred
                          </h4>
                        </div>
                        {starredChatsList.map(renderChatItem)}
                        <div className="h-4" />
                      </>
                    )}
                    
                    {regularChatsList.length > 0 && (
                      <>
                        {starredChatsList.length > 0 && (
                          <div className="px-2 py-1">
                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Recent
                            </h4>
                          </div>
                        )}
                        {regularChatsList.map(renderChatItem)}
                      </>
                    )}
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