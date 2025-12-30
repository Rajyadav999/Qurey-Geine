import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  databaseName?: string;
  databaseType?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  databaseName,
  databaseType = "PostgreSQL"
}) => {
  // Only show when connected
  if (!isConnected) return null;

  const displayName = databaseName || databaseType;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-gray-700">
        Connected to {displayName}
      </span>
    </div>
  );
};

export default ConnectionStatus;