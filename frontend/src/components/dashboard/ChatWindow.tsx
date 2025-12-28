import React, { useState } from 'react';
import { AlertCircle, Database, CheckCircle2, Copy, Check, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import EnhancedDataTable from './EnhancedDataTable';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  role?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onConnectDatabase: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

interface ParsedOutput {
  type: 'select' | 'status' | 'error' | 'confirmation_required';
  data?: string[][];
  columns?: string[];
  row_count?: number;
  message?: string;
  affected_rows?: number;
  sql?: string;
  table?: {
    columns: string[];
    data: string[][];
  };
}

function parseBackendResponse(content: string): {
  sql: string | null;
  output: ParsedOutput | null;
} {
  try {
    const sqlMatch = content.match(/SQL:\s*`([^`]+)`/);
    const sql = sqlMatch ? sqlMatch[1] : null;
    
    const outputMatch = content.match(/Output:\s*({.+})/s);
    if (outputMatch) {
      try {
        const output = JSON.parse(outputMatch[1]) as ParsedOutput;
        return { sql, output };
      } catch (error) {
        console.error('Failed to parse output JSON:', error);
      }
    }
  } catch (error) {
    console.error('Error parsing backend response:', error);
  }
  
  return { sql: null, output: null };
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  onConnectDatabase,
  onEditMessage 
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const lastUserMessageId = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const effectiveType = message.role === 'ai' ? 'assistant' : message.type;
      if (effectiveType === 'user') {
        return message.id;
      }
    }
    return null;
  }, [messages]);

  const handleCopyMessage = async (messageId: string, content: string, isUser: boolean) => {
    try {
      let textToCopy = content;
      
      if (!isUser) {
        const { sql, output } = parseBackendResponse(content);
        
        if (output) {
          if (output.type === 'select' && output.data && output.columns) {
            textToCopy = [
              output.columns.join('\t'),
              ...output.data.map(row => row.join('\t'))
            ].join('\n');
          } else if (output.message) {
            textToCopy = output.message;
          } else if (sql) {
            textToCopy = sql;
          }
        }
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (onEditMessage && editContent.trim()) {
      onEditMessage(messageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, messageId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(messageId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto bg-white p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Query Genie
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              An AI-powered database interaction platform that helps you explore and analyze your data using natural language
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                <p className="text-gray-900">Connect to your data source</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                <p className="text-gray-900">Ask questions in natural language</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                <p className="text-gray-900">Get instant insights and results</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const effectiveType = message.role === 'ai' ? 'assistant' : message.type;
            
            if (effectiveType === 'user') {
              const isEditing = editingMessageId === message.id;
              const isLastUserMessage = message.id === lastUserMessageId;
              
              return (
                <div key={message.id} className="flex justify-end group px-4">
                  <div className="max-w-[70%]">
                    {isEditing ? (
                      <div className="max-w-[70%]">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, message.id)}
                          className="w-full min-h-[100px] max-h-[300px] bg-white text-gray-900 border-2 border-blue-500 rounded-2xl focus:ring-0 focus:border-blue-600 mb-3 resize-none p-4 text-base shadow-sm"
                          autoFocus
                          rows={3}
                        />
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Editing this message will update your question. The AI will use the edited version to generate a new response.
                          </p>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="h-10 px-5 text-sm font-medium border-gray-300 rounded-lg hover:bg-gray-100"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(message.id)}
                            className="h-10 px-5 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-sm">
                          {message.content}
                        </div>
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyMessage(message.id, message.content, true)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-white rounded-full border border-gray-200 shadow-sm"
                            title="Copy"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {isLastUserMessage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(message.id, message.content)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-white rounded-full border border-gray-200 shadow-sm"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            if (effectiveType === 'error') {
              return (
                <div key={message.id} className="flex justify-center px-4">
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg max-w-2xl flex items-start gap-3">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium">{message.content}</p>
                      <Button
                        onClick={onConnectDatabase}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-800 hover:bg-red-100"
                      >
                        <Database size={16} className="mr-2" />
                        Connect Database
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            if (effectiveType === 'assistant') {
              const { sql, output } = parseBackendResponse(message.content);

              return (
                <div key={message.id} className="flex justify-start w-full group px-4">
                  <div className="w-full max-w-full space-y-3">
                    {output && output.type === 'select' && output.data && output.columns && (
                      <EnhancedDataTable
                        data={output.data}
                        columns={output.columns}
                        sqlQuery={sql || undefined}
                        executionTime={45}
                        searchable={true}
                        exportable={true}
                        sortable={false}
                        showPagination={true}
                      />
                    )}

                    {output && output.type === 'status' && (
                      <Alert className="border-green-500/50 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-700">
                          {output.message}
                          {output.affected_rows !== undefined && (
                            <span className="ml-2 font-semibold">
                              ({output.affected_rows} row{output.affected_rows !== 1 ? 's' : ''})
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {output && output.type === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {output.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    {output && output.type === 'confirmation_required' && (
                      <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-yellow-700 mb-2">
                              ⚠️ Dangerous Operation Detected
                            </p>
                            <p className="text-sm text-gray-600 mb-3">
                              This query will modify or delete data. Please review carefully.
                            </p>
                            {output.table && (
                              <EnhancedDataTable
                                data={output.table.data}
                                columns={output.table.columns}
                                sqlQuery={sql || undefined}
                                searchable={false}
                                exportable={false}
                                sortable={false}
                                showPagination={true}
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {!output && (
                      <Card className="p-4 bg-gray-50">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-all text-gray-700">
                          {message.content}
                        </pre>
                      </Card>
                    )}

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyMessage(message.id, message.content, false)}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-white rounded-full border border-gray-200 shadow-sm"
                        title="Copy"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
};

export default ChatWindow;