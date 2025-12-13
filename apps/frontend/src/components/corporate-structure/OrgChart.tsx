import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Building2,
  Shield,
  FileText,
  Users,
  Wallet,
  ChevronDown,
  Info,
  CheckCircle2,
  MapPin,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  formerName?: string; // For entities that are continuations of existing LLCs
  type: string;
  jurisdiction: string;
  jurisdictionFull: string;
  icon: typeof Building2;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  purpose: string;
  transitionNote?: string; // Note about how this entity fits in transition
  owns: string[];
  doesNot: string[];
  criticalDocs: string[];
  taxRationale: string;
}

const entities: Entity[] = [
  {
    id: 'holdings',
    name: 'Producer Tour Holdings, Inc.',
    type: 'Delaware C-Corp',
    jurisdiction: 'DE',
    jurisdictionFull: 'Delaware',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    glowColor: 'shadow-blue-500/20',
    purpose: 'Parent company / ownership layer / cap table / long-term equity vehicle',
    transitionNote: 'NEW ENTITY - Form fresh in Delaware',
    owns: [
      '100% membership interests of each LLC',
      'Equity incentives, investor documents, option plan',
      'High-level strategic contracts (rare)'
    ],
    doesNot: [
      'Run payroll directly',
      'Sign producer/admin client agreements',
      'Hold IP directly',
      'Receive management fees (non-operating)'
    ],
    criticalDocs: [
      'Certificate of Incorporation',
      'Bylaws + Board resolutions',
      'Annual minutes/consents',
      'Intercompany ownership docs'
    ],
    taxRationale: 'Delaware C-Corp provides 21% flat federal rate, QSBS eligibility potential, Court of Chancery expertise, and clean investor-ready cap table. No DE tax on out-of-state income.'
  },
  {
    id: 'ip',
    name: 'Producer Tour IP LLC',
    type: 'Delaware LLC',
    jurisdiction: 'DE',
    jurisdictionFull: 'Delaware',
    icon: Shield,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
    glowColor: 'shadow-purple-500/20',
    purpose: 'The vault - owns YOUR IP (trademarks, software, brand) not client IP',
    transitionNote: 'NEW ENTITY - Receives IP via Assignment Agreement',
    owns: [
      'Trademarks (Producer Tour name/logo)',
      'Copyrightable software codebase',
      'Domain names, brand assets, UI',
      'Internal datasets, matching logic',
      'Publishing/admin process IP'
    ],
    doesNot: [
      'Own client IP or catalogs',
      'Sign client agreements',
      'Handle payments directly'
    ],
    criticalDocs: [
      'IP Assignment Agreement (from existing LLC)',
      'Trademark ownership filings',
      'IP License Agreement to Admin/Ops',
      'Asset inventory & access control'
    ],
    taxRationale: 'Disregarded entity owned by Holdings = license fee income flows to C-Corp at 21%. Delaware provides strongest charging order protection for IP assets. No DE tax since no DE operations. No FICA on LLC profits.'
  },
  {
    id: 'admin',
    name: 'Producer Tour LLC',
    formerName: 'dba Producer Tour Publishing / Producer Tour Canada',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    jurisdictionFull: 'Florida',
    icon: FileText,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
    glowColor: 'shadow-amber-500/20',
    purpose: 'Publishing admin entity - signs client agreements, handles registrations & collections',
    transitionNote: 'EXISTING LLC - Keep credit history, bank accounts, PRO relationships',
    owns: [
      'Client publishing admin agreements',
      'BMI / ASCAP / PRO relationships',
      'Work registrations (US + Canada)',
      'Commission revenue recognition',
      'Existing bank accounts & credit lines'
    ],
    doesNot: [
      'Own IP (licenses from IP LLC)',
      'Own client catalogs (admin only)',
      'Run payroll (pays Ops for services)'
    ],
    criticalDocs: [
      'Client MSA + SOW templates',
      'Services Agreement with Ops LLC',
      'IP License from IP LLC'
    ],
    taxRationale: 'Disregarded entity owned by Holdings = commission income flows to C-Corp at 21%. Client royalties are trust liabilities (not revenue). FL = $0 state tax. No FICA on LLC profits.'
  },
  {
    id: 'ops',
    name: 'Producer Tour Ops LLC',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    jurisdictionFull: 'Florida',
    icon: Users,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    glowColor: 'shadow-green-500/20',
    purpose: 'Employment/contractor and operational risk box',
    transitionNote: 'NEW ENTITY - Move payroll & contractors here over time',
    owns: [
      'Payroll (employees)',
      'Contractor payments',
      'Day-to-day vendor contracts',
      'Customer support operations'
    ],
    doesNot: [
      'Own IP or trademarks',
      'Sign client agreements',
      'Hold client funds'
    ],
    criticalDocs: [
      'Contractor agreements w/ IP assignment',
      'Employment policies',
      'Intercompany Services Agreement',
      'Insurance policies (GL, E&O, Cyber)'
    ],
    taxRationale: 'Disregarded entity owned by Holdings = income flows to C-Corp at 21%. No FICA on LLC profits (owner is a corp). Officers receive W-2 wages with normal payroll tax. FL = $0 state tax.'
  },
  {
    id: 'finance',
    name: 'Producer Tour Finance LLC',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    jurisdictionFull: 'Florida',
    icon: Wallet,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/50',
    glowColor: 'shadow-emerald-500/20',
    purpose: 'Treasury + distributions + owner payouts',
    transitionNote: 'NEW ENTITY - Treasury & distribution management',
    owns: [
      'Receives distributions from Admin/Ops',
      'Pays owners, taxes, reserves',
      'Manages reinvestments',
      'Optionally holds processor relationships'
    ],
    doesNot: [
      'Run operations',
      'Sign client contracts',
      'Own IP'
    ],
    criticalDocs: [
      'Distribution policy',
      'Intercompany cash management policy',
      'Reserve requirements',
      'Treasury controls'
    ],
    taxRationale: 'Disregarded entity owned by Holdings = treasury functions consolidated at C-Corp level. FL = $0 state tax. Separates treasury risk from operating entities. No FICA on LLC profits.'
  }
];

export function OrgChart() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('owns');
  const [showJurisdictionRationale, setShowJurisdictionRationale] = useState(false);

  const holdingsEntity = entities.find(e => e.id === 'holdings')!;
  const subsidiaries = entities.filter(e => e.id !== 'holdings');

  return (
    <div className="relative space-y-8">
      {/* Jurisdiction Strategy Banner */}
      <motion.div
        className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 overflow-hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => setShowJurisdictionRationale(!showJurisdictionRationale)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-white flex items-center gap-2">
                Multi-State Jurisdiction Strategy
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tax Optimized
                </span>
              </h4>
              <p className="text-sm text-text-muted">Delaware (2 entities) + Florida (3 entities) = Maximum protection, zero state income tax</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: showJurisdictionRationale ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-blue-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showJurisdictionRationale && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 overflow-hidden"
            >
              <div className="p-4 grid md:grid-cols-2 gap-4">
                {/* Delaware */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-400">Delaware (DE)</span>
                    <span className="text-xs text-text-muted">2 entities</span>
                  </div>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">C-Corp:</strong> Court of Chancery expertise, established case law, QSBS eligibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">IP LLC:</strong> Strongest charging order protection, series LLC option</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">No DE tax</strong> on entities with no Delaware operations</span>
                    </li>
                  </ul>
                </div>

                {/* Florida */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">Florida (FL)</span>
                    <span className="text-xs text-text-muted">3 entities</span>
                  </div>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">ZERO state income tax</strong> on pass-through LLC income</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Operating entities:</strong> Revenue recognition, payroll, treasury</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Homestead state:</strong> Aligns with owner residence for maximum benefit</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tax Attorney Note */}
              <div className="px-4 pb-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-text-secondary">
                      <span className="text-amber-400 font-semibold">Tax Attorney Note:</span> This DE/FL split is intentional.
                      Delaware for legal protection of holding company + IP assets. Florida for operating entities where income
                      is recognized - avoiding state income tax on pass-through profits. If owners are FL residents, this
                      structure achieves <span className="text-white font-medium">federal-only taxation</span> on operating income.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Holdings Company (Parent) */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EntityNode
          entity={holdingsEntity}
          isSelected={selectedEntity === 'holdings'}
          onClick={() => setSelectedEntity(selectedEntity === 'holdings' ? null : 'holdings')}
          isParent
        />
      </motion.div>

      {/* Connecting Lines */}
      <div className="relative h-16 mb-4">
        <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Main vertical line from Holdings */}
          <motion.line
            x1="50%"
            y1="0"
            x2="50%"
            y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
          {/* Horizontal line */}
          <motion.line
            x1="10%"
            y1="50%"
            x2="90%"
            y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
          {/* Vertical lines to each subsidiary */}
          {subsidiaries.map((_, i) => {
            const xPos = 10 + (i * 20) + 10;
            return (
              <motion.line
                key={i}
                x1={`${xPos}%`}
                y1="50%"
                x2={`${xPos}%`}
                y2="100%"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
              />
            );
          })}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Subsidiaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {subsidiaries.map((entity, index) => (
          <motion.div
            key={entity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
          >
            <EntityNode
              entity={entity}
              isSelected={selectedEntity === entity.id}
              onClick={() => setSelectedEntity(selectedEntity === entity.id ? null : entity.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Entity Details Panel */}
      <AnimatePresence>
        {selectedEntity && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <EntityDetailsPanel
              entity={entities.find(e => e.id === selectedEntity)!}
              expandedSection={expandedSection}
              onSectionChange={setExpandedSection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EntityNode({
  entity,
  isSelected,
  onClick,
  isParent = false
}: {
  entity: Entity;
  isSelected: boolean;
  onClick: () => void;
  isParent?: boolean;
}) {
  const Icon = entity.icon;
  const isExisting = entity.transitionNote?.includes('EXISTING');
  const isPhase2 = entity.transitionNote?.includes('PHASE 2');

  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full p-4 rounded-2xl border-2 transition-all duration-300
        ${entity.borderColor} ${entity.bgColor}
        ${isSelected ? `shadow-lg ${entity.glowColor}` : 'hover:shadow-md'}
        ${isParent ? 'max-w-md mx-auto' : ''}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${entity.bgColor} border ${entity.borderColor}
        `}>
          <Icon className={`w-6 h-6 ${entity.color}`} />
        </div>
        <div className="text-left flex-1">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm leading-tight">{entity.name}</p>
            {isExisting && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                EXISTING
              </span>
            )}
            {isPhase2 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                PHASE 2
              </span>
            )}
          </div>
          {entity.formerName && (
            <p className="text-text-muted text-xs mt-0.5">{entity.formerName}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-text-muted text-xs">{entity.type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              entity.jurisdiction === 'DE'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {entity.jurisdiction}
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isSelected ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-text-muted" />
        </motion.div>
      </div>
    </motion.button>
  );
}

function EntityDetailsPanel({
  entity,
  expandedSection,
  onSectionChange
}: {
  entity: Entity;
  expandedSection: string;
  onSectionChange: (section: string) => void;
}) {
  const Icon = entity.icon;
  const isExisting = entity.transitionNote?.includes('EXISTING');
  const isPhase2 = entity.transitionNote?.includes('PHASE 2');

  const sections = [
    { id: 'owns', title: 'What it owns/handles', items: entity.owns, icon: CheckCircle2 },
    { id: 'doesNot', title: 'What it does NOT do', items: entity.doesNot, icon: Info },
    { id: 'docs', title: 'Critical documents', items: entity.criticalDocs, icon: FileText },
  ];

  return (
    <div className={`rounded-2xl border-2 ${entity.borderColor} ${entity.bgColor} p-6`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center
          ${entity.bgColor} border ${entity.borderColor}
        `}>
          <Icon className={`w-8 h-8 ${entity.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-white">{entity.name}</h3>
            {isExisting && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                EXISTING LLC
              </span>
            )}
            {isPhase2 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                PHASE 2
              </span>
            )}
          </div>
          {entity.formerName && (
            <p className="text-sm text-text-muted mt-0.5">{entity.formerName}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-text-muted">{entity.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
              entity.jurisdiction === 'DE'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <MapPin className="w-3 h-3" />
              {entity.jurisdictionFull}
            </span>
          </div>
          <p className="text-text-secondary mt-2">{entity.purpose}</p>
        </div>
      </div>

      {/* Transition Note */}
      {entity.transitionNote && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
          isExisting
            ? 'bg-amber-500/10 border border-amber-500/30'
            : isPhase2
              ? 'bg-gray-500/10 border border-gray-500/30'
              : 'bg-blue-500/10 border border-blue-500/30'
        }`}>
          <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
            isExisting ? 'text-amber-400' : isPhase2 ? 'text-gray-400' : 'text-blue-400'
          }`} />
          <span className={`text-xs font-medium ${
            isExisting ? 'text-amber-400' : isPhase2 ? 'text-gray-400' : 'text-blue-400'
          }`}>
            {entity.transitionNote}
          </span>
        </div>
      )}

      {/* Tax Rationale */}
      <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30">
        <div className="flex items-start gap-2">
          <Scale className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-xs font-semibold text-amber-400">Tax Rationale</span>
            <p className="text-xs text-text-secondary mt-1">{entity.taxRationale}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid md:grid-cols-3 gap-4">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            className={`
              rounded-xl border transition-all duration-300 cursor-pointer
              ${expandedSection === section.id
                ? `${entity.borderColor} ${entity.bgColor}`
                : 'border-white/10 bg-white/[0.02] hover:border-white/20'}
            `}
            onClick={() => onSectionChange(section.id)}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <section.icon className={`w-4 h-4 ${entity.color}`} />
                <span className="text-sm font-medium text-white">{section.title}</span>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      section.id === 'doesNot' ? 'bg-red-400' : entity.color.replace('text-', 'bg-')
                    }`} />
                    <span className="text-xs text-text-secondary">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
