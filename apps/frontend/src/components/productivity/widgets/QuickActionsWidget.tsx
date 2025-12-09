import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, CreditCard, Users, Music, BarChart3 } from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color: string;
}

/**
 * QuickActionsWidget - One-click buttons for common admin tasks
 *
 * Provides fast access to frequently used actions without
 * navigating through menus.
 */
export default function QuickActionsWidget({ config: _config, isEditing }: WidgetProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'new-invoice',
      label: 'New Invoice',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'billing-hub' } }),
      color: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400',
    },
    {
      id: 'approve-placement',
      label: 'Placements',
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'pending-placements' } }),
      color: 'bg-green-500/20 hover:bg-green-500/30 text-green-400',
    },
    {
      id: 'view-statements',
      label: 'Statements',
      icon: <BarChart3 className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'statements' } }),
      color: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400',
    },
    {
      id: 'payouts',
      label: 'Payouts',
      icon: <CreditCard className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'payouts' } }),
      color: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400',
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'contacts' } }),
      color: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400',
    },
    {
      id: 'music',
      label: 'Shop',
      icon: <Music className="w-4 h-4" />,
      onClick: () => navigate('/admin', { state: { activeTab: 'shop' } }),
      color: 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400',
    },
  ];

  return (
    <div className="p-3 h-full">
      <div className="grid grid-cols-2 gap-2 h-full">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={isEditing}
            className={`flex flex-col items-center justify-center gap-1.5 p-3
              rounded-lg transition-all ${action.color}
              ${isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
