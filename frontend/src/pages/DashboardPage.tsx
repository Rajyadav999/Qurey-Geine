import { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatInput from '@/components/dashboard/ChatInput';
import ChatWindow from '@/components/dashboard/ChatWindow';
import UserProfile from '@/components/dashboard/UserProfile';
import Logo from '@/components/Logo';
import { DatabaseConnectionModal } from '@/components/dashboard/DatabaseConnectionModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = "http://localhost:8000";

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'error';
  role?: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  user_id?: number;
  title: string;
  timestamp: string | number | Date;
  messages: Message[];
}

const DashboardPage = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    console.log('[DASHBOARD] User state changed:', user?.id);
    
    if (user?.id) {
      console.log(`[DASHBOARD] User ${user.id} logged in, loading chat history...`);
      loadChatHistory();
    } else {
      console.log('[DASHBOARD] User logged out, clearing all state');
      setChatHistory([]);
      setMessages([]);
      setCurrentChatId(null);
      setIsConnected(false);
      setConnectionData(null);
    }
  }, [user?.id]);

  const loadChatHistory = async () => {
    if (!user?.id) {
      console.log('[DASHBOARD] No user ID, skipping history load');
      return;
    }

    setIsLoadingHistory(true);
    try {
      console.log(`[DASHBOARD] Fetching chat sessions for user ${user.id}...`);
      const response = await fetch(`${API_BASE}/api/chat-sessions?user_id=${user.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('[DASHBOARD] No chat sessions found (404), starting fresh');
          setChatHistory([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch chat sessions`);
      }

      const data = await response.json();
      console.log(`[DASHBOARD] Received ${data.length} sessions from backend`);
      
      if (!Array.isArray(data)) {
        console.error('[DASHBOARD] Invalid response format:', data);
        setChatHistory([]);
        return;
      }
      
      const userSessions = data
        .filter((session: any) => {
          if (!session.id || !session.user_id) {
            console.warn('[DASHBOARD] Invalid session structure:', session);
            return false;
          }
          
          const matches = session.user_id === parseInt(user.id);
          if (!matches) {
            console.warn(`[DASHBOARD] Filtering out session ${session.id} - belongs to user ${session.user_id}, not ${user.id}`);
          }
          return matches;
        })
        .map((session: any) => {
          try {
            return {
              id: session.id.toString(),
              user_id: session.user_id,
              title: session.title || 'Untitled Chat',
              timestamp: session.timestamp || new Date().toISOString(),
              messages: Array.isArray(session.messages) 
                ? session.messages.map((msg: any) => ({
                    id: msg.id || `msg-${Date.now()}`,
                    content: msg.content || '',
                    type: msg.type || 'user',
                    role: msg.role || (msg.type === 'user' ? 'user' : 'ai'),
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                  }))
                : []
            };
          } catch (err) {
            console.error('[DASHBOARD] Error parsing session:', session, err);
            return null;
          }
        })
        .filter((session: any) => session !== null);
      
      console.log(`[DASHBOARD] Successfully loaded ${userSessions.length} chat sessions for user ${user.id}`);
      setChatHistory(userSessions);
      
      if (userSessions.length > 0) {
        toast({
          title: "Chat History Loaded",
          description: `${userSessions.length} conversation(s) restored`,
        });
      }
      
    } catch (error: any) {
      console.error('[DASHBOARD] Error loading chat history:', error);
      
      if (!error.message.includes('404')) {
        toast({
          variant: "destructive",
          title: "Error Loading History",
          description: error.message || "Failed to load chat history",
        });
      }
      
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleConnect = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: data.host,
          port: parseInt(data.port),
          user: data.user,
          password: data.password,
          database: data.database
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionData(data);
        setIsConnected(true);
        setIsModalOpen(false);
        toast({
          title: "✅ Connected Successfully",
          description: `Connected to ${data.database} database`,
        });
      } else {
        throw new Error(result.detail?.message || 'Connection failed');
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Connection error:', error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || 'Failed to connect to database',
      });
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleNewChat = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated",
      });
      return;
    }

    setMessages([]);
    setCurrentChatId(null);
    
    console.log('[DASHBOARD] Creating new chat for user:', user.id);
    
    toast({
      title: "New Chat",
      description: "Started a new conversation",
    });
  };

  const handleChatSelect = (chatId: string) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat) {
      console.log(`[DASHBOARD] Loading chat ${chatId} with ${selectedChat.messages.length} messages`);
      setMessages(selectedChat.messages);
      setCurrentChatId(chatId);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message || !message.trim()) return;
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated",
      });
      return;
    }
    
    const chatTitle = message.length > 50 
      ? message.substring(0, 50).trim() + '...' 
      : message.trim();
    
    const chatId = currentChatId || Date.now().toString();
    const isNewChat = !currentChatId;
    
    if (isNewChat) {
      setCurrentChatId(chatId);
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      type: 'user',
      role: 'user',
      timestamp: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    if (!isConnected) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Database connection unavailable. Please connect to a database to get accurate results.',
        type: 'error',
        timestamp: new Date()
      };
      const messagesWithError = [...newMessages, errorMessage];
      setMessages(messagesWithError);
      
      await saveChatToBackend(chatId, chatTitle, messagesWithError, isNewChat);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payload = {
        question: message,
        chat_history: messages.map(msg => ({
          role: msg.type === 'user' ? 'human' : 'ai',
          content: msg.content
        })),
      };

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      let assistantContent = '';
      if (data.success) {
        assistantContent = data.response;
      } else {
        assistantContent = `Error: ${data.error}`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: assistantContent,
        type: 'assistant',
        role: 'ai',
        timestamp: new Date()
      };
      
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      
      await saveChatToBackend(chatId, chatTitle, finalMessages, isNewChat);

    } catch (error) {
      console.error("[DASHBOARD] Failed to send message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, an unexpected error occurred while communicating with the server.',
        type: 'error',
        timestamp: new Date()
      };
      const messagesWithError = [...newMessages, errorMessage];
      setMessages(messagesWithError);
      
      await saveChatToBackend(chatId, chatTitle, messagesWithError, isNewChat);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NEW: Handle message editing
  const handleEditMessage = async (messageId: string, newContent: string) => {
    console.log('[DASHBOARD] Editing message:', messageId, 'New content:', newContent);
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated",
      });
      return;
    }

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      console.error('[DASHBOARD] Message not found');
      return;
    }

    const message = messages[messageIndex];
    const effectiveType = message.role === 'ai' ? 'assistant' : message.type;
    if (effectiveType !== 'user') {
      console.error('[DASHBOARD] Can only edit user messages');
      return;
    }

    // STEP 1: Remove all messages after the edited message
    const updatedMessages = messages.slice(0, messageIndex);
    console.log(`[DASHBOARD] Removed ${messages.length - messageIndex} messages after edit`);
    
    // STEP 2: Create edited message
    const editedMessage: Message = {
      ...message,
      content: newContent,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    // STEP 3: Update state with edited message only
    setMessages([...updatedMessages, editedMessage]);
    setIsLoading(true);

    try {
      // STEP 4: Prepare chat history
      const chatHistoryPayload = updatedMessages.map(msg => ({
        role: msg.type === 'user' ? 'human' : 'ai',
        content: msg.content
      }));

      console.log('[DASHBOARD] Sending edited message to backend...');

      // STEP 5: Send to backend as NEW prompt
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newContent,
          chat_history: chatHistoryPayload
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log('[DASHBOARD] Received new response from backend');

      // STEP 6: Add fresh AI response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.success ? data.response : `Error: ${data.error}`,
        type: 'assistant',
        role: 'ai',
        timestamp: new Date()
      };
      
      const finalMessages = [...updatedMessages, editedMessage, assistantMessage];
      setMessages(finalMessages);
      
      // Save updated chat to backend
      if (currentChatId) {
        const chatTitle = finalMessages[0]?.content.substring(0, 50) || 'Edited Chat';
        await saveChatToBackend(currentChatId, chatTitle, finalMessages, false);
      }

      console.log('[DASHBOARD] Edit complete with new AI response');
      
      toast({
        title: "Message Edited",
        description: "Your message has been updated with a new response",
      });
      
    } catch (error: any) {
      console.error('[DASHBOARD] Error getting new response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Failed to get response for edited message.',
        type: 'error',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        variant: "destructive",
        title: "Edit Failed",
        description: error.message || "Failed to get response for edited message",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatToBackend = async (
    chatId: string, 
    title: string, 
    messages: Message[], 
    isNewChat: boolean
  ) => {
    if (!user) {
      console.error('[DASHBOARD] Cannot save chat: User not authenticated');
      return;
    }

    try {
      const payload = {
        user_id: parseInt(user.id),
        title,
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          role: msg.role || (msg.type === 'user' ? 'user' : 'ai'),
          timestamp: msg.timestamp.toISOString()
        }))
      };

      if (isNewChat) {
        console.log(`[DASHBOARD] Creating new chat session for user ${user.id}`);
        const response = await fetch(`${API_BASE}/api/chat-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create chat session');
        }

        const newSession = await response.json();
        console.log(`[DASHBOARD] Created session ${newSession.id} for user ${user.id}`);
        
        setCurrentChatId(newSession.id.toString());
        
        const sessionToAdd: ChatSession = {
          id: newSession.id.toString(),
          user_id: parseInt(user.id),
          title: newSession.title,
          timestamp: newSession.timestamp,
          messages: messages
        };
        
        setChatHistory(prev => [sessionToAdd, ...prev]);
        console.log(`[DASHBOARD] Added session to history. Total sessions: ${chatHistory.length + 1}`);
        
      } else {
        console.log(`[DASHBOARD] Updating chat session ${chatId} for user ${user.id}`);
        const response = await fetch(`${API_BASE}/api/chat-sessions/${chatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update chat session');
        }

        const updatedSession = await response.json();
        console.log(`[DASHBOARD] Updated session ${chatId}`);
        
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === chatId 
              ? { ...chat, messages, timestamp: updatedSession.timestamp }
              : chat
          )
        );
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Error saving chat:', error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: error.message || "Failed to save chat session",
      });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated",
      });
      return;
    }

    try {
      console.log(`[DASHBOARD] Deleting chat ${chatId} for user ${user.id}`);
      const response = await fetch(
        `${API_BASE}/api/chat-sessions/${chatId}?user_id=${user.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete session');
      }

      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      
      console.log(`[DASHBOARD] Deleted chat ${chatId}. Remaining sessions: ${chatHistory.length - 1}`);
      
      toast({
        title: "Chat Deleted",
        description: "Chat history has been removed",
      });
    } catch (error: any) {
      console.error('[DASHBOARD] Delete error:', error);
      toast({
        variant: "destructive",
        title: "Delete Error",
        description: error.message || "Failed to delete chat session",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/disconnect`, { method: 'POST' });
      
      setIsConnected(false);
      setConnectionData(null);
      
      toast({
        title: "Disconnected",
        description: "Database connection has been closed",
      });
    } catch (error) {
      console.error('[DASHBOARD] Disconnect error:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isConnected={isConnected}
          onConnect={handleConnect}
          onNewChat={handleNewChat}
          chatHistory={chatHistory}
          onOpenModal={handleOpenModal}
          onChatSelect={handleChatSelect}
          currentChatId={currentChatId}
          onDeleteChat={handleDeleteChat}
          onDisconnect={handleDisconnect}
          userId={user?.id ? parseInt(user.id) : null}
          isLoadingHistory={isLoadingHistory}
        />

        <div className="flex-1 flex flex-col relative">
          <header className="flex items-center justify-between p-4 bg-surface">
            <Logo size="sm" />
            <UserProfile />
          </header>

          <ChatWindow 
            messages={messages}
            onConnectDatabase={handleOpenModal}
            onEditMessage={handleEditMessage}
          />

          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            isConnected={isConnected}
            onOpenModal={handleOpenModal}
          />
        </div>
      </div>

      <DatabaseConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
      />
    </div>
  );
};

export default DashboardPage;