import { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatInput from '@/components/dashboard/ChatInput';
import ChatWindow from '@/components/dashboard/ChatWindow';
import UserProfile from '@/components/dashboard/UserProfile';
import Logo from '@/components/Logo';
import { DatabaseConnectionModal } from '@/components/dashboard/DatabaseConnectionModal';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'error';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string | number; // ✅ Changed to accept number (timestamp)
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
  
  const { toast } = useToast();

  // ✅ Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('queryGenieChatHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((chat: ChatSession) => ({
          ...chat,
          messages: chat.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // ✅ Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('queryGenieChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [chatHistory]);

  const handleConnect = (data: any) => {
    setConnectionData(data);
    setIsConnected(true);
    setIsModalOpen(false);
    toast({
      title: "Connected Successfully",
      description: `Connected to ${data.type.toUpperCase()}`,
    });
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleNewChat = () => {
    console.log('Creating new chat. Current history count:', chatHistory.length);
    setMessages([]);
    setCurrentChatId(null);
    toast({
      title: "New Chat",
      description: "Started a new conversation",
    });
  };

  const handleChatSelect = (chatId: string) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat) {
      setMessages(selectedChat.messages);
      setCurrentChatId(chatId);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message || !message.trim()) return;
    
    // Create chat title from first 50 characters
    const chatTitle = message.length > 50 
      ? message.substring(0, 50).trim() + '...' 
      : message.trim();
    
    // Get or create chat ID
    const chatId = currentChatId || Date.now().toString();
    if (!currentChatId) {
      setCurrentChatId(chatId);
    }
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      type: 'user',
      timestamp: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    const limitedMessages = newMessages.length > 6 ? newMessages.slice(-6) : newMessages;
    setMessages(limitedMessages);
    
    // Save to chat history
    saveChatHistory(chatId, chatTitle, limitedMessages);
    
    // Check if database is connected
    if (!isConnected) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Database connection unavailable. Please connect to a database to get accurate results.',
        type: 'error',
        timestamp: new Date()
      };
      const messagesWithError = [...limitedMessages, errorMessage];
      const finalMessages = messagesWithError.length > 6 ? messagesWithError.slice(-6) : messagesWithError;
      setMessages(finalMessages);
      saveChatHistory(chatId, chatTitle, finalMessages);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call your backend API
      const API_BASE = "http://localhost:8000";
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
        timestamp: new Date()
      };
      
      const finalMessages = [...limitedMessages, assistantMessage];
      const limitedFinalMessages = finalMessages.length > 6 ? finalMessages.slice(-6) : finalMessages;
      setMessages(limitedFinalMessages);
      saveChatHistory(chatId, chatTitle, limitedFinalMessages);

    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, an unexpected error occurred while communicating with the server.',
        type: 'error',
        timestamp: new Date()
      };
      const messagesWithError = [...limitedMessages, errorMessage];
      const finalMessages = messagesWithError.length > 6 ? messagesWithError.slice(-6) : messagesWithError;
      setMessages(finalMessages);
      saveChatHistory(chatId, chatTitle, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Store actual timestamp instead of 'just now'
  const saveChatHistory = (chatId: string, title: string, messages: Message[]) => {
    setChatHistory(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === chatId);
      const newChat: ChatSession = {
        id: chatId,
        title,
        timestamp: Date.now(), // ✅ Changed from 'just now' to Date.now()
        messages
      };
      
      if (existingIndex >= 0) {
        // Update existing - keep original timestamp
        const updated = [...prev];
        updated[existingIndex] = {
          ...newChat,
          timestamp: prev[existingIndex].timestamp // ✅ Preserve original timestamp
        };
        return updated;
      } else {
        // Add new chat at the beginning
        return [newChat, ...prev];
      }
    });
  };

  const handleDeleteChat = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
    toast({
      title: "Chat Deleted",
      description: "Chat history has been removed",
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionData(null);
    toast({
      title: "Disconnected",
      description: "Database connection has been closed",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-border bg-surface">
            <Logo size="sm" />
            <UserProfile />
          </header>

          {/* Chat Window */}
          <ChatWindow 
            messages={messages}
            onConnectDatabase={handleOpenModal}
          />

          {/* Chat Input */}
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            isConnected={isConnected}
            onOpenModal={handleOpenModal}
          />
        </div>
      </div>

      {/* Database Connection Modal */}
      <DatabaseConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
      />
    </div>
  );
};

export default DashboardPage;