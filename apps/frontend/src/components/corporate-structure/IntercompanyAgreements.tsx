import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Shield,
  Scale,
  Handshake
} from 'lucide-react';

interface Agreement {
  id: string;
  title: string;
  from: string;
  to: string;
  purpose: string;
  keyTerms: string[];
  critical: boolean;
  color: string;
}

const agreements: Agreement[] = [
  {
    id: 'ip-license',
    title: 'IP License Agreement',
    from: 'Producer Tour IP LLC (DE)',
    to: 'Producer Tour LLC (FL)',
    purpose: 'Grants right to use Producer Tour brand, software, trademarks, and proprietary processes',
    keyTerms: [
      'License fee schedule (arm\'s length / market rate pricing)',
      'Scope of licensed IP (trademarks, software, admin processes)',
      'Sublicense restrictions (no sublicensing without approval)',
      'Termination provisions and IP return',
      'Audit rights for licensor'
    ],
    critical: true,
    color: 'purple'
  },
  {
    id: 'services',
    title: 'Intercompany Services Agreement',
    from: 'Producer Tour Ops LLC (FL)',
    to: 'Producer Tour LLC (FL)',
    purpose: 'Ops LLC provides staffing, support, dev services, and customer operations',
    keyTerms: [
      'Services description and SLAs',
      'Fee structure (cost-plus 10-15% or market rate)',
      'Allocation methodology for shared resources',
      'Performance metrics and reporting',
      'Confidentiality and data handling'
    ],
    critical: true,
    color: 'green'
  },
  {
    id: 'ip-assignment',
    title: 'IP Assignment Agreements',
    from: 'Founders / Contractors',
    to: 'Producer Tour IP LLC (DE)',
    purpose: 'Transfers ownership of all created IP to the vault entity',
    keyTerms: [
      'Work-made-for-hire provisions',
      'Assignment of all rights (worldwide, perpetual)',
      'Moral rights waiver (where applicable)',
      'Representations of originality',
      'Consideration terms (nominal or fair value)'
    ],
    critical: true,
    color: 'purple'
  },
  {
    id: 'client-admin',
    title: 'Client Administration Agreement',
    from: 'Producer Tour LLC (FL)',
    to: 'Client (Writer/Publisher)',
    purpose: 'Master agreement for publishing administration services - royalty collection, registration, and accounting',
    keyTerms: [
      'Scope of admin services (registration, collection, accounting)',
      'Commission rate (typically 10-15%)',
      'Territory coverage (US, Canada, International)',
      'Trust accounting requirements for client funds',
      'Term, renewal, and termination provisions',
      'Audit rights for client'
    ],
    critical: true,
    color: 'amber'
  },
  {
    id: 'distribution',
    title: 'Distribution Policy',
    from: 'FL LLCs (Admin / Ops)',
    to: 'Holdings, Inc. (DE)',
    purpose: 'Governs how after-tax profits flow upstream to parent C-Corp',
    keyTerms: [
      'Distribution timing and frequency',
      'Reserve requirements (operating, tax, emergency)',
      'Tax withholding procedures',
      'Board approval thresholds',
      'Documentation and resolution requirements'
    ],
    critical: false,
    color: 'emerald'
  },
  {
    id: 'cash-management',
    title: 'Cash Management Policy',
    from: 'All Entities',
    to: 'Finance LLC (FL)',
    purpose: 'Establishes treasury discipline, intercompany lending, and fund handling',
    keyTerms: [
      'Intercompany loan terms (if applicable)',
      'Interest rate methodology (AFR or market)',
      'Payment timing and netting requirements',
      'Bank account segregation rules',
      'Monthly reconciliation procedures'
    ],
    critical: false,
    color: 'emerald'
  }
];

export function IntercompanyAgreements() {
  const [expandedAgreement, setExpandedAgreement] = useState<string | null>('ip-license');

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Critical Intercompany Agreements</h3>
          <p className="text-text-secondary text-sm">
            These documents must exist to make your structure legally defensible
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">4 Critical Documents</span>
        </div>
      </div>

      {/* Warning Box */}
      <motion.div
        className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-1">Without These Documents:</h4>
            <p className="text-xs text-text-secondary">
              If you don't actually assign the IP and paper the licenses, "IP LLC" is cosplay. Courts will treat
              all entities as one business, and your liability protection disappears. These aren't optional.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Agreement Cards */}
      <div className="space-y-3">
        {agreements.map((agreement, index) => {
          const colors = getColorClasses(agreement.color);
          const isExpanded = expandedAgreement === agreement.id;

          return (
            <motion.div
              key={agreement.id}
              className={`
                rounded-2xl border-2 overflow-hidden transition-all duration-300
                ${isExpanded ? `${colors.border} ${colors.bg}` : 'border-white/10 bg-white/[0.02]'}
              `}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpandedAgreement(isExpanded ? null : agreement.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${colors.bg} border ${colors.border}
                  `}>
                    <FileText className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  {/* Title & Flow */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-white">{agreement.title}</h4>
                      {agreement.critical && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
                      <span className={colors.text}>{agreement.from}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className={colors.text}>{agreement.to}</span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className={`w-5 h-5 ${colors.text}`} />
                  </motion.div>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-white/10">
                      <p className="text-sm text-text-secondary mb-4">{agreement.purpose}</p>

                      <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                        Key Terms to Include
                      </h5>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {agreement.keyTerms.map((term, i) => (
                          <motion.li
                            key={i}
                            className="flex items-start gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.text}`} />
                            <span className="text-sm text-text-secondary">{term}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Summary */}
      <motion.div
        className="grid md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {[
          {
            icon: Scale,
            title: 'Arm\'s Length Pricing',
            desc: 'Intercompany fees must be market-reasonable to avoid IRS scrutiny',
            color: 'amber'
          },
          {
            icon: Handshake,
            title: 'Actual Execution',
            desc: 'Agreements must be signed and followed - not just filed away',
            color: 'green'
          },
          {
            icon: Shield,
            title: 'Regular Review',
            desc: 'Annual review ensures terms still match actual business operations',
            color: 'blue'
          }
        ].map((item) => {
          const colors = getColorClasses(item.color);
          return (
            <div
              key={item.title}
              className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}
            >
              <item.icon className={`w-6 h-6 ${colors.text} mb-3`} />
              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-text-secondary">{item.desc}</p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
