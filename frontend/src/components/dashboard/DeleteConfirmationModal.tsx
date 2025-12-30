import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueryDetails {
  action: string;
  table: string;
  condition: string;
  impact: string;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  queryDetails: QueryDetails;
  sql: string;
  isLoading?: boolean;
}

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  queryDetails,
  sql,
  isLoading = false
}: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="flex-shrink-0 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg text-yellow-800 mb-1">Confirmation Required</h3>
              <p className="text-sm text-yellow-700">This action will permanently modify the database.</p>
            </div>
          </div>
        </div>

        {/* SQL Query Display */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">SQL Query:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <code className="text-sm text-gray-800 font-mono break-all">{sql}</code>
          </div>
        </div>

        {/* Details Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">1 rows</h4>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Table
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200">
                    Condition
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Impact
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 font-semibold">
                    {queryDetails.action}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 uppercase">
                    {queryDetails.table}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 border-r border-gray-200">
                    {queryDetails.condition}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {queryDetails.impact}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Executing...' : 'Confirm & Execute'}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="ghost"
            className="text-gray-700 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;