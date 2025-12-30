import { useState, useRef, useEffect } from 'react';
import { Send, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  onOpenModal: () => void;
}

const ChatInput = ({ onSend, isLoading, isConnected, onOpenModal }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, but cap at max-height (200px)
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // Adjust height whenever message changes
  useEffect(() => {
    adjustHeight();
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    // Call parent's onSend function
    onSend(trimmedMessage);
    
    // Clear input field and reset height
    setMessage('');
    
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="bg-white p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative rounded-[26px] border border-gray-300 focus-within:border-gray-500 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected 
                ? "Ask me anything about your data..." 
                : "Connect to a database to start querying..."
            }
            className="w-full min-h-[52px] max-h-[200px] resize-none p-3 pr-24 bg-transparent border-0 rounded-[26px] focus:outline-none focus:ring-0 text-gray-900 overflow-y-auto placeholder:text-gray-400"
            disabled={isLoading}
            rows={1}
            style={{ 
              height: '52px',
              lineHeight: '1.5'
            }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {!isConnected && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100 rounded-full"
                onClick={onOpenModal}
                disabled={isLoading}
                title="Connect to database"
              >
                <Database size={18} className="text-gray-600" />
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!message.trim() || isLoading}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          {isConnected 
            ? "Press Enter to send • Shift+Enter for new line" 
            : "Connect to your database to start exploring"}
        </p>
      </form>
    </div>
  );
};

export default ChatInput;