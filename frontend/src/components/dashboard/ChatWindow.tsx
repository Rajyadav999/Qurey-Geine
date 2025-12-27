import React from 'react';
import { AlertCircle, Database, CheckCircle2, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  role?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onConnectDatabase: () => void;
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

// Parse the backend response
function parseBackendResponse(content: string): {
  sql: string | null;
  output: ParsedOutput | null;
} {
  console.log('Parsing backend response:', content);
  
  try {
    // Extract SQL query
    const sqlMatch = content.match(/SQL:\s*`([^`]+)`/);
    const sql = sqlMatch ? sqlMatch[1] : null;
    
    // Extract output JSON
    const outputMatch = content.match(/Output:\s*({.+})/s);
    if (outputMatch) {
      try {
        const output = JSON.parse(outputMatch[1]) as ParsedOutput;
        console.log('Parsed output:', output);
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

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onConnectDatabase }) => {
  console.log('Rendering ChatWindow with messages:', messages);
  
  return (
    <div className="flex-1 overflow-y-auto bg-surface p-4 chat-window-watermark">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Welcome to Query Genie
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              An AI-powered database interaction platform that helps you explore and analyze your data using natural language
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                <p className="text-foreground">Connect to your data source</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                <p className="text-foreground">Ask questions in natural language</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                <p className="text-foreground">Get instant insights and results</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            console.log('Processing message:', message);
            const effectiveType = message.role === 'ai' ? 'assistant' : message.type;
            
            // User messages
            if (effectiveType === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg max-w-[80%] shadow-sm">
                    {message.content}
                  </div>
                </div>
              );
            }

            // Error messages
            if (effectiveType === 'error') {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg max-w-[80%] flex items-start gap-3">
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

            // Assistant messages
            if (effectiveType === 'assistant') {
              const { sql, output } = parseBackendResponse(message.content);

              return (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[90%] space-y-3">
                    {/* SQL Query Display */}
                    {sql && (
                      <Card className="p-4 bg-muted/30">
                        <div className="flex items-start gap-2">
                          <Code className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">SQL Query:</p>
                            <code className="text-sm font-mono text-foreground break-all">
                              {sql}
                            </code>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Output Display */}
                    {output && (
                      <>
                        {/* SELECT Query Results - Table */}
                        {output.type === 'select' && output.data && output.columns && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                              <span className="flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Query Results
                              </span>
                              <span>
                                {output.row_count || output.data.length} row{(output.row_count || output.data.length) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            
                            <Card className="overflow-hidden">
                              <div className="overflow-x-auto max-h-[500px]">
                                <Table>
                                  <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                      {output.columns.map((column, index) => (
                                        <TableHead 
                                          key={index}
                                          className="font-semibold text-foreground bg-muted/50 whitespace-nowrap"
                                        >
                                          {column}
                                        </TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {output.data.length === 0 ? (
                                      <TableRow>
                                        <TableCell 
                                          colSpan={output.columns.length} 
                                          className="text-center text-muted-foreground py-8"
                                        >
                                          No results found
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      output.data.map((row, rowIndex) => (
                                        <TableRow key={rowIndex} className="hover:bg-muted/50 transition-colors">
                                          {row.map((cell, cellIndex) => (
                                            <TableCell key={cellIndex} className="font-mono text-sm">
                                              {cell || <span className="text-muted-foreground italic">null</span>}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </Card>
                          </div>
                        )}

                        {/* Status Messages (INSERT, UPDATE, DELETE, etc.) */}
                        {output.type === 'status' && (
                          <Alert className="border-green-500/50 bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-700 dark:text-green-400">
                              {output.message}
                              {output.affected_rows !== undefined && (
                                <span className="ml-2 font-semibold">
                                  ({output.affected_rows} row{output.affected_rows !== 1 ? 's' : ''})
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Error Messages */}
                        {output.type === 'error' && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {output.message}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Confirmation Required */}
                        {output.type === 'confirmation_required' && (
                          <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                                  ⚠️ Dangerous Operation Detected
                                </p>
                                <p className="text-sm text-muted-foreground mb-3">
                                  This query will modify or delete data. Please review carefully.
                                </p>
                                {output.table && (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          {output.table.columns.map((col, i) => (
                                            <TableHead key={i}>{col}</TableHead>
                                          ))}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {output.table.data.map((row, i) => (
                                          <TableRow key={i}>
                                            {row.map((cell, j) => (
                                              <TableCell key={j}>{cell}</TableCell>
                                            ))}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        )}
                      </>
                    )}

                    {/* Fallback - Display raw response if parsing fails */}
                    {!output && (
                      <Card className="p-4 bg-muted/30">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-all text-muted-foreground">
                          {message.content}
                        </pre>
                      </Card>
                    )}
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