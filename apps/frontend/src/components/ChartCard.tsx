import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChartCardProps {
  title: string;
  chartId: string;
  isExpanded: boolean;
  onToggleExpand: (chartId: string) => void;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  chartId,
  isExpanded,
  onToggleExpand,
  children,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => onToggleExpand(chartId)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
      <div
        className="transition-all duration-300 ease-in-out"
        style={{ height: isExpanded ? '600px' : '300px' }}
      >
        {children}
      </div>
    </div>
  );
};
