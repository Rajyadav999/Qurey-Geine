import { useState } from 'react';
import { Send, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  isConnected: boolean;
  onOpenModal: () => void;
}

const ChatInput = ({ onSend, isLoading, isConnected, onOpenModal }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    // Call parent's onSend function
    onSend(trimmedMessage);
    
    // Clear input field
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-surface-elevated p-4 border-t border-border">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected 
                ? "Ask me anything about your data..." 
                : "Connect to a database to start querying..."
            }
            className="w-full min-h-[3rem] max-h-32 resize-none p-3 pr-24 bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-foreground"
            disabled={isLoading}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {!isConnected && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenModal}
                disabled={isLoading}
                title="Connect to database"
              >
                <Database size={18} />
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 bg-brand-600 hover:bg-brand-700"
              disabled={!message.trim() || isLoading}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {isConnected 
            ? "Press Enter to send • Shift+Enter for new line" 
            : "Connect to your database to start exploring"}
        </p>
      </form>
    </div>
  );
};

export default ChatInput;