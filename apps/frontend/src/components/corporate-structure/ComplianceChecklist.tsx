import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  FileCheck,
  Building2,
  Wallet,
  Shield,
  Users,
  Clock,
  ChevronDown
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  task: string;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annual';
  entity: string;
  critical: boolean;
  description?: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: typeof Building2;
  color: string;
  items: ChecklistItem[];
}

const checklistCategories: ChecklistCategory[] = [
  {
    id: 'corporate',
    title: 'Corporate Governance',
    icon: Building2,
    color: 'blue',
    items: [
      { id: 'board-minutes', task: 'Board meeting minutes', frequency: 'annual', entity: 'Holdings, Inc.', critical: true },
      { id: 'shareholder-consents', task: 'Shareholder consents/resolutions', frequency: 'annual', entity: 'Holdings, Inc.', critical: true },
      { id: 'de-franchise', task: 'Delaware franchise tax filing', frequency: 'annual', entity: 'Holdings, Inc.', critical: true },
      { id: 'de-annual', task: 'Delaware annual report', frequency: 'annual', entity: 'Holdings, Inc.', critical: false },
      { id: 'officer-records', task: 'Update officer/director records', frequency: 'annual', entity: 'Holdings, Inc.', critical: false },
    ]
  },
  {
    id: 'financial',
    title: 'Financial Separation',
    icon: Wallet,
    color: 'green',
    items: [
      { id: 'bank-accounts', task: 'Maintain separate bank accounts per entity', frequency: 'one-time', entity: 'All Entities', critical: true, description: 'Each entity must have its own bank account - no commingling' },
      { id: 'reconciliation', task: 'Intercompany account reconciliation', frequency: 'monthly', entity: 'All Entities', critical: true },
      { id: 'arm-length', task: 'Review arm\'s length pricing', frequency: 'quarterly', entity: 'All Entities', critical: true },
      { id: 'distribution-docs', task: 'Document all distributions', frequency: 'quarterly', entity: 'FL LLCs → Holdings', critical: true },
      { id: 'trust-reconcile', task: 'Reconcile client trust accounts', frequency: 'monthly', entity: 'Producer Tour LLC', critical: true, description: 'Ensure client funds (trust liabilities) match bank balances' },
    ]
  },
  {
    id: 'contracts',
    title: 'Contract & Legal',
    icon: FileCheck,
    color: 'purple',
    items: [
      { id: 'correct-entity', task: 'Sign contracts with correct entity name', frequency: 'one-time', entity: 'All Entities', critical: true, description: 'Never sign as "Producer Tour" - always use full legal name' },
      { id: 'intercompany-review', task: 'Review intercompany agreements', frequency: 'annual', entity: 'All Entities', critical: true },
      { id: 'ip-audit', task: 'IP assignment audit', frequency: 'annual', entity: 'IP LLC', critical: true },
      { id: 'contractor-agreements', task: 'Audit contractor IP assignments', frequency: 'quarterly', entity: 'Ops LLC', critical: true },
      { id: 'insurance-review', task: 'Review insurance coverage', frequency: 'annual', entity: 'PT LLC / Ops LLC', critical: false },
    ]
  },
  {
    id: 'operations',
    title: 'Operational Compliance',
    icon: Users,
    color: 'amber',
    items: [
      { id: 'entity-bills', task: 'Each entity pays its own bills', frequency: 'monthly', entity: 'All Entities', critical: true },
      { id: 'payroll-correct', task: 'Payroll from correct entity (Ops)', frequency: 'monthly', entity: 'Ops LLC', critical: true },
      { id: 'client-invoicing', task: 'Client statements from Producer Tour LLC', frequency: 'monthly', entity: 'Producer Tour LLC', critical: true },
      { id: 'license-fees', task: 'Pay IP license fees on schedule', frequency: 'quarterly', entity: 'PT LLC → IP LLC', critical: true },
      { id: 'services-fees', task: 'Pay services fees on schedule', frequency: 'monthly', entity: 'PT LLC → Ops LLC', critical: true },
    ]
  },
  {
    id: 'protection',
    title: 'Asset Protection',
    icon: Shield,
    color: 'emerald',
    items: [
      { id: 'trademark-maint', task: 'Trademark maintenance & renewals', frequency: 'annual', entity: 'IP LLC', critical: true },
      { id: 'ip-registry', task: 'Update IP asset registry', frequency: 'quarterly', entity: 'IP LLC', critical: false },
      { id: 'access-audit', task: 'Audit system access controls', frequency: 'quarterly', entity: 'Ops LLC', critical: false },
      { id: 'incident-plan', task: 'Review incident response plan', frequency: 'annual', entity: 'Ops LLC', critical: false },
      { id: 'cyber-policy', task: 'Review cyber insurance limits', frequency: 'annual', entity: 'PT LLC / Ops LLC', critical: false },
    ]
  }
];

const frequencyLabels: Record<string, { label: string; color: string }> = {
  'one-time': { label: 'One-time', color: 'bg-gray-500/20 text-gray-400' },
  'monthly': { label: 'Monthly', color: 'bg-blue-500/20 text-blue-400' },
  'quarterly': { label: 'Quarterly', color: 'bg-amber-500/20 text-amber-400' },
  'annual': { label: 'Annual', color: 'bg-green-500/20 text-green-400' },
};

export function ComplianceChecklist() {
  const [expandedCategory, setExpandedCategory] = useState<string>('corporate');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    };
    return colors[color] || colors.blue;
  };

  const totalItems = checklistCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const criticalItems = checklistCategories.reduce((sum, cat) => sum + cat.items.filter(i => i.critical).length, 0);
  const completedItems = checkedItems.size;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Ongoing Compliance Checklist</h3>
          <p className="text-text-secondary text-sm">
            Maintain your corporate veil with consistent discipline
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{completedItems}/{totalItems}</div>
            <div className="text-xs text-text-muted">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{criticalItems}</div>
            <div className="text-xs text-text-muted">Critical</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${(completedItems / totalItems) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Frequency Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(frequencyLabels).map(([key, { label, color }]) => (
          <div key={key} className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
            <Clock className="w-3 h-3 inline-block mr-1" />
            {label}
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {checklistCategories.map((category, catIndex) => {
          const colors = getColorClasses(category.color);
          const isExpanded = expandedCategory === category.id;
          const categoryCompleted = category.items.filter(i => checkedItems.has(i.id)).length;

          return (
            <motion.div
              key={category.id}
              className={`
                rounded-2xl border-2 overflow-hidden transition-all duration-300
                ${isExpanded ? `${colors.border} ${colors.bg}` : 'border-white/10 bg-white/[0.02]'}
              `}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpandedCategory(isExpanded ? '' : category.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${colors.bg} border ${colors.border}
                  `}>
                    <category.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{category.title}</h4>
                    <p className="text-sm text-text-muted">
                      {categoryCompleted}/{category.items.length} completed
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.text.replace('text-', 'bg-')}`}
                        style={{ width: `${(categoryCompleted / category.items.length) * 100}%` }}
                      />
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className={`w-5 h-5 ${colors.text}`} />
                    </motion.div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 space-y-2">
                    {category.items.map((item, itemIndex) => {
                      const isChecked = checkedItems.has(item.id);
                      const freq = frequencyLabels[item.frequency];

                      return (
                        <motion.div
                          key={item.id}
                          className={`
                            flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
                            ${isChecked ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/[0.02] hover:bg-white/[0.04]'}
                          `}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: itemIndex * 0.03 }}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="mt-0.5">
                            {isChecked ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-text-muted" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm ${isChecked ? 'text-green-400 line-through' : 'text-white'}`}>
                                {item.task}
                              </span>
                              {item.critical && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-text-muted">{item.entity}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${freq.color}`}>
                                {freq.label}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-text-muted mt-1">{item.description}</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary Note */}
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Set Calendar Reminders</h4>
            <p className="text-xs text-text-secondary">
              Block time monthly for reconciliation, quarterly for reviews, and annually for governance.
              Consistent discipline is what makes the structure defensible. Sloppy execution = pierced veil.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
