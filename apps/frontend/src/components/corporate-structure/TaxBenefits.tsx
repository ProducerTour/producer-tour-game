import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Calculator,
  TrendingDown,
  Shield,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  MapPin,
  Scale,
  Gavel
} from 'lucide-react';

interface TaxStrategy {
  id: string;
  entity: string;
  jurisdiction: string;
  strategy: string;
  benefit: string;
  details: string[];
  taxRate?: string;
  stateTax: string;
  color: string;
}

const taxStrategies: TaxStrategy[] = [
  {
    id: 'admin-llc',
    entity: 'Producer Tour LLC',
    jurisdiction: 'FL',
    strategy: 'Trust Liability + Disregarded Entity',
    benefit: 'Client funds as trust liability, commission flows to C-Corp at 21%',
    details: [
      'Single-member LLC owned by Holdings = disregarded entity',
      'Client royalties booked as trust liabilities (NOT revenue)',
      'Only admin commission (10-15%) recognized as taxable income',
      'Income flows directly to C-Corp (21% federal rate)',
      'Intercompany payments to Ops/IP create internal deductions',
      'Florida = $0 state income tax'
    ],
    taxRate: '21% Corp',
    stateTax: '$0 FL state tax',
    color: 'amber'
  },
  {
    id: 'ops-llc',
    entity: 'Producer Tour Ops LLC',
    jurisdiction: 'FL',
    strategy: 'Disregarded Entity (C-Corp Owned)',
    benefit: 'No FICA on LLC profits - only on officer W-2 wages',
    details: [
      'Single-member LLC owned by Holdings = disregarded entity',
      'Income flows directly to C-Corp (21% federal rate)',
      'NO self-employment tax on LLC profits (owner is a corp)',
      'FICA (15.3%) only applies to officer W-2 wages',
      'Officers manage LLC but are employees of the corporate structure',
      'Florida = $0 state income tax on pass-through'
    ],
    taxRate: '21% Corp',
    stateTax: '$0 FL state tax',
    color: 'green'
  },
  {
    id: 'ip-llc',
    entity: 'Producer Tour IP LLC',
    jurisdiction: 'DE',
    strategy: 'Disregarded Entity + Asset Protection',
    benefit: 'IP isolated in strongest jurisdiction, income flows to C-Corp',
    details: [
      'Single-member LLC owned by Holdings = disregarded for tax',
      'Strongest charging order protection in the country',
      'License fees received flow directly to C-Corp (21%)',
      'IP appreciation protected from operational liability',
      'No DE tax (no Delaware operations)',
      'Series LLC option for future IP segregation'
    ],
    taxRate: '21% Corp',
    stateTax: '$0 DE state tax',
    color: 'purple'
  },
  {
    id: 'holdings',
    entity: 'Producer Tour Holdings, Inc.',
    jurisdiction: 'DE',
    strategy: 'C-Corp Retention + QSBS',
    benefit: 'Retained earnings at 21% + potential 100% gain exclusion',
    details: [
      '21% flat federal rate vs personal rates up to 37%',
      'Retain earnings for growth/acquisitions without distribution',
      'QSBS eligibility potential: 100% capital gains exclusion on exit (up to $10M or 10x basis)',
      'Court of Chancery expertise for corporate governance',
      'Clean cap table for investors - no management fees (non-operating)',
      'No DE tax on out-of-state income'
    ],
    taxRate: '21% Federal',
    stateTax: '$0 DE state tax',
    color: 'emerald'
  }
];

const antiPiercingChecklist = [
  { item: 'Separate bank accounts for each entity', critical: true },
  { item: 'Separate accounting files / QuickBooks accounts', critical: true },
  { item: 'Written intercompany agreements (arm\'s length)', critical: true },
  { item: 'Market-reasonable intercompany pricing', critical: true },
  { item: 'Each entity pays its own bills (no card swipes across entities)', critical: true },
  { item: 'Correct legal name on all contracts (full entity name, not "Producer Tour")', critical: true },
  { item: 'Annual minutes/consents (C-Corp)', critical: true },
  { item: 'Proper capitalization per entity', critical: false },
  { item: 'Insurance covering risk entities (Admin/Ops)', critical: false },
  { item: 'Clean IP chain of title (all assignments signed)', critical: false },
];

const jurisdictionComparison = [
  {
    state: 'Delaware',
    entities: ['Producer Tour Holdings, Inc.', 'Producer Tour IP LLC'],
    pros: [
      'Court of Chancery (no jury trials, expert judges)',
      'Most developed corporate case law',
      'Strongest LLC charging order protection',
      'QSBS eligibility for C-Corp (100% cap gains exclusion)',
      'Series LLC option for IP segregation',
      'No state tax on out-of-state income'
    ],
    cons: [
      'Annual franchise tax (~$225 C-Corp, ~$300 LLC)',
      'Must register as foreign entity in FL for operations'
    ],
    color: 'blue'
  },
  {
    state: 'Florida',
    entities: ['Producer Tour LLC', 'Ops LLC', 'Finance LLC'],
    pros: [
      'ZERO state income tax on pass-through entities',
      'Strong homestead exemption (if owner is FL resident)',
      'No foreign registration needed (operating state)',
      'Simple annual reporting ($138.75/entity)',
      'Aligns with owner residence for federal-only taxation'
    ],
    cons: [
      'Less developed LLC case law than Delaware',
      'Weaker charging order protection than DE'
    ],
    color: 'emerald'
  }
];

export function TaxBenefits() {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>('holdings');
  const [showChecklist, setShowChecklist] = useState(false);
  const [showJurisdictionAnalysis, setShowJurisdictionAnalysis] = useState(true);

  const getColorClasses = (color: string, type: 'bg' | 'border' | 'text' | 'gradient') => {
    const colors: Record<string, Record<string, string>> = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', gradient: 'from-blue-500 to-blue-600' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400', gradient: 'from-green-500 to-green-600' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400', gradient: 'from-amber-500 to-amber-600' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400', gradient: 'from-purple-500 to-purple-600' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
    };
    return colors[color]?.[type] || '';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">Tax Attorney Analysis</span>
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-2">Multi-Jurisdiction Tax Optimization</h3>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Delaware for protection + Florida for operations = Federal-only taxation on operating income
        </p>
      </div>

      {/* Jurisdiction Analysis */}
      <motion.div
        className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => setShowJurisdictionAnalysis(!showJurisdictionAnalysis)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-white">Jurisdiction Selection Rationale</h4>
              <p className="text-sm text-text-muted">Why DE + FL is the optimal combination</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showJurisdictionAnalysis ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-blue-400" />
          </motion.div>
        </button>

        {showJurisdictionAnalysis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-t border-white/10"
          >
            <div className="p-4 grid md:grid-cols-2 gap-4">
              {jurisdictionComparison.map((jurisdiction) => (
                <div
                  key={jurisdiction.state}
                  className={`p-4 rounded-xl ${getColorClasses(jurisdiction.color, 'bg')} border ${getColorClasses(jurisdiction.color, 'border')}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className={`w-4 h-4 ${getColorClasses(jurisdiction.color, 'text')}`} />
                    <span className={`font-bold ${getColorClasses(jurisdiction.color, 'text')}`}>{jurisdiction.state}</span>
                  </div>
                  <div className="text-xs text-text-muted mb-3">
                    Entities: {jurisdiction.entities.join(', ')}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-green-400 mb-1">Advantages</div>
                      <ul className="space-y-1">
                        {jurisdiction.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                            <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-400 mb-1">Considerations</div>
                      <ul className="space-y-1">
                        {jurisdiction.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                            <Info className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tax Attorney Note */}
            <div className="px-4 pb-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <Gavel className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 mb-2">Tax Attorney Opinion</h4>
                    <div className="space-y-2 text-xs text-text-secondary">
                      <p>
                        <strong className="text-white">Disregarded Entity Structure:</strong> All 4 LLCs are single-member LLCs owned 100% by Holdings, Inc.
                        This makes them <span className="text-blue-400 font-semibold">"disregarded entities"</span> for federal tax purposes - their income
                        flows directly to the C-Corp and is taxed at the flat 21% corporate rate.
                      </p>
                      <p>
                        <strong className="text-white">FICA / Payroll Tax:</strong> Because the LLCs are owned by a corporation (not individuals),
                        <span className="text-emerald-400 font-semibold"> there is NO self-employment tax (15.3% FICA)</span> on LLC profits.
                        FICA only applies to W-2 wages paid to officers/employees. Officers of Holdings can manage the LLCs as employees,
                        with FICA applying only to their reasonable salary.
                      </p>
                      <p>
                        <strong className="text-white">State Tax Strategy:</strong> FL LLCs have $0 state income tax. DE entities have no DE tax
                        on out-of-state income. The C-Corp consolidates all LLC income and pays 21% federal rate with ability to retain earnings
                        for reinvestment or QSBS-eligible exit.
                      </p>
                      <p>
                        <strong className="text-white">Net Effect:</strong> Client royalties (trust liability) → Commission flows to C-Corp (21%) →
                        No FICA on profits → Officer wages subject to normal payroll tax → Retained earnings or dividends to shareholders.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Tax Rate Comparison */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {[
          { label: 'PT LLC (FL)', rate: '21%', desc: 'Disregarded → C-Corp', color: 'amber', state: '$0 state tax' },
          { label: 'Ops LLC (FL)', rate: '21%', desc: 'Disregarded → C-Corp', color: 'green', state: '$0 state tax' },
          { label: 'IP LLC (DE)', rate: '21%', desc: 'Disregarded → C-Corp', color: 'purple', state: '$0 state tax' },
          { label: 'Holdings (DE)', rate: '21%', desc: 'Retained earnings', color: 'emerald', state: 'No FICA on profits' },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-3 rounded-xl ${getColorClasses(item.color, 'bg')} border ${getColorClasses(item.color, 'border')}`}
          >
            <div className={`text-xl font-bold ${getColorClasses(item.color, 'text')}`}>{item.rate}</div>
            <div className="text-xs text-white font-medium mt-1">{item.label}</div>
            <div className="text-xs text-text-muted">{item.desc}</div>
            <div className="text-xs text-emerald-400 mt-1">{item.state}</div>
          </div>
        ))}
      </motion.div>

      {/* Strategy Cards */}
      <div className="space-y-3">
        {taxStrategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            className={`
              rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
              ${expandedStrategy === strategy.id
                ? `${getColorClasses(strategy.color, 'border')} ${getColorClasses(strategy.color, 'bg')}`
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'}
            `}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setExpandedStrategy(expandedStrategy === strategy.id ? null : strategy.id)}
          >
            <div className="p-4">
              <div className="flex items-center gap-4">
                {/* Tax Rate Badge */}
                <div className={`
                  min-w-[80px] px-3 py-2 rounded-xl text-center
                  ${getColorClasses(strategy.color, 'bg')} border ${getColorClasses(strategy.color, 'border')}
                `}>
                  <div className={`text-lg font-bold ${getColorClasses(strategy.color, 'text')}`}>
                    {strategy.taxRate}
                  </div>
                  <div className="text-xs text-emerald-400">{strategy.stateTax}</div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-white">{strategy.entity}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      strategy.jurisdiction === 'DE'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      <MapPin className="w-3 h-3" />
                      {strategy.jurisdiction}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getColorClasses(strategy.color, 'bg')} ${getColorClasses(strategy.color, 'text')}`}>
                      {strategy.strategy}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{strategy.benefit}</p>
                </div>

                {/* Expand Icon */}
                <motion.div
                  animate={{ rotate: expandedStrategy === strategy.id ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className={`w-5 h-5 ${getColorClasses(strategy.color, 'text')}`} />
                </motion.div>
              </div>

              {/* Expanded Details */}
              {expandedStrategy === strategy.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <ul className="grid md:grid-cols-2 gap-2">
                    {strategy.details.map((detail, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getColorClasses(strategy.color, 'text')}`} />
                        <span className="text-sm text-text-secondary">{detail}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Anti-Piercing Checklist */}
      <motion.div
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-white">Corporate Veil Protection Checklist</h4>
              <p className="text-sm text-text-muted">If you skip these, opposing counsel will pierce your veil</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showChecklist ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </motion.div>
        </button>

        {showChecklist && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="border-t border-amber-500/20"
          >
            <div className="p-4 grid md:grid-cols-2 gap-3">
              {antiPiercingChecklist.map((item, i) => (
                <motion.div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    item.critical ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.02]'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {item.critical ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <span className="text-sm text-white">{item.item}</span>
                    {item.critical && (
                      <span className="ml-2 text-xs text-amber-400 font-medium">CRITICAL</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-text-secondary">
                    <span className="text-red-400 font-medium">Warning:</span> If you skip these requirements,
                    opposing counsel will argue "It's all one alter-ego business" and courts may agree.
                    The multi-state structure provides no protection if entities are not actually separate.
                    You paid for complexity - now execute it properly.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom Summary */}
      <motion.div
        className="grid md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {[
          {
            icon: TrendingDown,
            title: 'Zero State Income Tax',
            desc: 'FL operating entities = no state tax on pass-through profits to FL-resident owners',
            color: 'emerald'
          },
          {
            icon: Calculator,
            title: 'Stack Deductions',
            desc: 'Intercompany payments (Ops fees, IP license) reduce Admin LLC taxable income',
            color: 'amber'
          },
          {
            icon: Building2,
            title: 'Retain at 21%',
            desc: 'DE C-Corp holds retained earnings at flat federal rate for reinvestment or QSBS exit',
            color: 'blue'
          }
        ].map((item) => (
          <div
            key={item.title}
            className={`p-4 rounded-xl ${getColorClasses(item.color, 'bg')} border ${getColorClasses(item.color, 'border')}`}
          >
            <item.icon className={`w-6 h-6 ${getColorClasses(item.color, 'text')} mb-3`} />
            <h4 className="font-semibold text-white mb-1">{item.title}</h4>
            <p className="text-xs text-text-secondary">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
