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
    <div className="bg-slate-700/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <button
          onClick={() => onToggleExpand(chartId)}
          className="p-2 hover:bg-slate-600/50 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-300" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-300" />
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
