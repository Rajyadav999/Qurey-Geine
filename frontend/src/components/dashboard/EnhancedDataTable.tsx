import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Copy,
  Check,
  Search,
  Code,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EnhancedDataTableProps {
  data: string[][];
  columns: string[];
  sqlQuery?: string;
  executionTime?: number;
  totalRows?: number;
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
  showPagination?: boolean;
}

const EnhancedDataTable: React.FC<EnhancedDataTableProps> = ({
  data,
  columns,
  sqlQuery,
  executionTime,
  totalRows = data.length,
  pageSize = 10,
  searchable = true,
  sortable = false,
  exportable = true,
  showPagination = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [sqlVisible, setSqlVisible] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row =>
      row.some(cell => 
        cell?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = showPagination 
    ? filteredData.slice(startIndex, endIndex)
    : filteredData;

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      columns.join(','),
      ...filteredData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const textContent = [
      columns.join('\t'),
      ...filteredData.map(row => row.join('\t'))
    ].join('\n');
    
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copySqlToClipboard = async () => {
    if (!sqlQuery) return;
    try {
      await navigator.clipboard.writeText(sqlQuery);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg font-medium mb-2">No data to display</p>
          <p className="text-sm">Try running a different query</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SQL Query Viewer */}
      {sqlQuery && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Code className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">SQL Query:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copySqlToClipboard}
                className="h-8 text-xs hover:bg-gray-100"
              >
                {sqlCopied ? (
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSqlVisible(!sqlVisible)}
                className="h-8 text-xs hover:bg-gray-100"
              >
                {sqlVisible ? (
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
            </div>
          </div>
          
          {sqlVisible && (
            <div className="px-4 py-3 bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">{sqlQuery}</pre>
            </div>
          )}
        </div>
      )}

      {/* Query Results Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Query Results Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-800">Query Results</span>
          </div>
          <span className="text-sm text-gray-600 font-medium">{filteredData.length} rows returned</span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-semibold bg-gray-100 text-gray-800 px-3 py-1 rounded-md">
              {filteredData.length} rows
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {exportable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-sm h-9 border-gray-300 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="text-sm h-9 border-gray-300 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-800"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-3.5 text-sm text-gray-900"
                    >
                      {cell || (
                        <span className="text-gray-400 italic text-xs">NULL</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 bg-white border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} results
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="h-9 px-3 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="px-2 text-gray-500 text-sm">...</span>
                    ) : (
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        className={`h-9 min-w-[36px] px-3 text-sm font-medium ${
                          currentPage === page
                            ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
                            : "border-gray-300 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {page}
                      </Button>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="h-9 px-3 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDataTable;