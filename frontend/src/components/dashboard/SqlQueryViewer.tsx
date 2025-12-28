import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Clock,
  Zap
} from 'lucide-react';

interface SqlQueryViewerProps {
  query: string;
  executionTime?: number;
  rowCount?: number;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

const SqlQueryViewer: React.FC<SqlQueryViewerProps> = ({
  query,
  executionTime,
  rowCount,
  isVisible = false,
  onToggleVisibility
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">SQL Query</span>
          {executionTime && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {executionTime}ms
            </Badge>
          )}
          {rowCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {rowCount} rows
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="h-8 px-2 text-xs"
            >
              {isVisible ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {isVisible && (
        <div className="p-4 bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap">
            <code>{query}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default SqlQueryViewer;
