import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Building2,
  DollarSign,
  Calculator,
  FileText,
  CheckSquare,
  ChevronRight,
  Shield,
  Download,
  Share2,
  Sparkles,
  Box
} from 'lucide-react';
import {
  OrgChart,
  MoneyFlow,
  TaxBenefits,
  IntercompanyAgreements,
  ComplianceChecklist,
  Structure3D
} from '../components/corporate-structure';

type TabId = 'structure' | 'flow' | 'tax' | 'agreements' | 'compliance' | '3d';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Building2;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'structure',
    label: 'Corporate Structure',
    icon: Building2,
    description: 'Entity hierarchy and purposes'
  },
  {
    id: 'flow',
    label: 'Money Flow',
    icon: DollarSign,
    description: 'How cash moves through entities'
  },
  {
    id: 'tax',
    label: 'Tax Benefits',
    icon: Calculator,
    description: 'Entity-level tax optimization'
  },
  {
    id: 'agreements',
    label: 'Agreements',
    icon: FileText,
    description: 'Critical intercompany documents'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: CheckSquare,
    description: 'Ongoing maintenance checklist'
  },
  {
    id: '3d',
    label: '3D View',
    icon: Box,
    description: 'Interactive 3D corporate structure'
  }
];

export default function CorporateStructurePage() {
  const [activeTab, setActiveTab] = useState<TabId>('structure');

  const renderContent = () => {
    switch (activeTab) {
      case 'structure':
        return <OrgChart />;
      case 'flow':
        return <MoneyFlow />;
      case 'tax':
        return <TaxBenefits />;
      case 'agreements':
        return <IntercompanyAgreements />;
      case 'compliance':
        return <ComplianceChecklist />;
      case '3d':
        return <Structure3D />;
      default:
        return <OrgChart />;
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Producer Tour Holdings</h1>
                <p className="text-xs text-text-muted">Corporate Structure Bible</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:bg-white/10 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-hero-gradient opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-50/20 to-surface" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">Delaware C-Corp Structure</span>
            </motion.div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Producer Tour
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                Corporate Architecture
              </span>
            </h1>

            <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
              The complete operating bible for your Delaware holding company structure.
              Asset protection, tax optimization, and liability separation - all documented.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { value: '2 DE + 3 FL', label: '5 Entities', color: 'blue' },
                { value: '$0', label: 'State Tax', color: 'emerald' },
                { value: '21%', label: 'C-Corp Rate', color: 'purple' },
                { value: 'QSBS', label: 'Exit Ready', color: 'green' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`p-4 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/30`}
                >
                  <div className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</div>
                  <div className="text-xs text-text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="mb-8">
            {/* Mobile: Dropdown style */}
            <div className="md:hidden">
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as TabId)}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted rotate-90 pointer-events-none" />
              </div>
            </div>

            {/* Desktop: Tab bar */}
            <div className="hidden md:flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300
                      ${isActive
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                        : 'text-text-muted hover:text-white hover:bg-white/5'}
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Description */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3"
          >
            {(() => {
              const currentTab = tabs.find(t => t.id === activeTab)!;
              return (
                <>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                    <currentTab.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{currentTab.label}</h2>
                    <p className="text-sm text-text-muted">{currentTab.description}</p>
                  </div>
                </>
              );
            })()}
          </motion.div>

          {/* Content Panel */}
          <motion.div
            key={activeTab + '-content'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8"
          >
            {renderContent()}
          </motion.div>
        </div>
      </section>

      {/* Key Principles Footer */}
      <section className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-bold text-white mb-6 text-center">Core Principles</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: Shield,
                title: 'Asset Protection',
                desc: 'IP isolated from operational risk',
                color: 'purple'
              },
              {
                icon: DollarSign,
                title: 'Tax Efficiency',
                desc: 'Trust liability = zero tax on client funds',
                color: 'blue'
              },
              {
                icon: FileText,
                title: 'Paper Trail',
                desc: 'Every transfer documented and defensible',
                color: 'amber'
              },
              {
                icon: Building2,
                title: 'Clean Exit',
                desc: 'Diligence-ready for investors or acquisition',
                color: 'emerald'
              }
            ].map((principle) => (
              <motion.div
                key={principle.title}
                className={`p-4 rounded-xl bg-${principle.color}-500/10 border border-${principle.color}-500/30`}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <principle.icon className={`w-6 h-6 text-${principle.color}-400 mb-3`} />
                <h4 className="font-semibold text-white mb-1">{principle.title}</h4>
                <p className="text-xs text-text-secondary">{principle.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="py-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-text-muted text-center">
            This document is for internal planning purposes only. Consult with qualified legal and tax professionals
            before implementing any corporate structure changes. Not legal or tax advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
