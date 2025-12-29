import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Radio,
  Music2,
  Tv,
  Building2,
  ArrowDown,
  DollarSign,
  Users,
  Shield,
  FileText,
  Wallet,
  Play,
  Pause,
  RotateCcw,
  ChevronRight
} from 'lucide-react';

interface FlowStep {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  description: string;
  entity: string;
  color: string;
  icon: typeof DollarSign;
  journalEntry?: {
    debit: string;
    credit: string[];
  };
}

const flowSteps: FlowStep[] = [
  {
    id: 'collect',
    step: 1,
    title: 'Royalties Collected',
    subtitle: 'BMI / ASCAP / MLC / DSPs',
    description: 'Gross royalties flow into Producer Tour LLC as custodial funds. This money is NOT revenue - it\'s booked as trust liability (money you hold for clients).',
    entity: 'Producer Tour LLC (FL)',
    color: 'blue',
    icon: Music2,
    journalEntry: {
      debit: 'Cash: $100,000',
      credit: ['Client Trust Liability: $90,000', 'Commission Receivable: $10,000']
    }
  },
  {
    id: 'payout',
    step: 2,
    title: 'Client Payouts',
    subtitle: 'Trust Liability Reduction',
    description: 'Clients, writers, and co-publishers receive their share. This reduces the trust liability - it was never your income to begin with.',
    entity: 'Producer Tour LLC (FL)',
    color: 'green',
    icon: Users
  },
  {
    id: 'commission',
    step: 3,
    title: 'Commission Recognition',
    subtitle: 'Revenue Recognition',
    description: 'Your admin commission (typically 10-15%) is now recognized as revenue. This is the ONLY taxable income from client royalties.',
    entity: 'Producer Tour LLC (FL)',
    color: 'amber',
    icon: FileText,
    journalEntry: {
      debit: 'Commission Receivable: $10,000',
      credit: ['Commission Revenue: $10,000']
    }
  },
  {
    id: 'expenses',
    step: 4,
    title: 'Intercompany Deductions',
    subtitle: 'Stack the Expenses',
    description: 'Admin LLC pays Ops LLC (labor/services), IP LLC (brand/software license fees), insurance, and vendors. Each is a deductible expense.',
    entity: 'Multiple FL + DE Entities',
    color: 'purple',
    icon: Shield
  },
  {
    id: 'upstream',
    step: 5,
    title: 'Profit Upstreaming',
    subtitle: 'Distributions to Holdings',
    description: 'After-tax profits flow up as distributions to Holdings, Inc. C-Corp retains earnings at 21% federal rate for reinvestment, acquisitions, or QSBS-eligible exit.',
    entity: 'Producer Tour Holdings, Inc. (DE)',
    color: 'emerald',
    icon: Building2
  }
];

const revenueSourceIcons = [
  { icon: Radio, label: 'Radio', color: 'from-orange-500 to-red-500' },
  { icon: Music2, label: 'Streaming', color: 'from-green-500 to-emerald-500' },
  { icon: Tv, label: 'TV & Film', color: 'from-blue-500 to-indigo-500' },
  { icon: Building2, label: 'Venues', color: 'from-purple-500 to-pink-500' },
];

export function MoneyFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showJournal, setShowJournal] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Auto-advance through steps
      const interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= flowSteps.length - 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setIsPlaying(false);
  };

  const getColorClasses = (color: string, type: 'bg' | 'border' | 'text') => {
    const colors: Record<string, Record<string, string>> = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/50', text: 'text-amber-400' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    };
    return colors[color]?.[type] || '';
  };

  return (
    <div className="relative">
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Money Flow Visualization</h3>
          <p className="text-text-secondary text-sm">See exactly how cash moves through your corporate structure</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-sm font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Revenue Sources */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs text-text-muted mb-3 text-center">Revenue Sources</p>
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {revenueSourceIcons.map((source, i) => (
            <motion.div
              key={source.label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center"
              animate={{
                scale: activeStep === 0 ? [1, 1.05, 1] : 1,
                borderColor: activeStep === 0 ? ['rgba(255,255,255,0.1)', 'rgba(59,130,246,0.5)', 'rgba(255,255,255,0.1)'] : 'rgba(255,255,255,0.1)'
              }}
              transition={{ duration: 1.5, repeat: activeStep === 0 ? Infinity : 0, delay: i * 0.2 }}
            >
              <div className={`inline-flex w-8 h-8 rounded-lg bg-gradient-to-br ${source.color} items-center justify-center mb-1`}>
                <source.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-text-secondary">{source.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Animated Flow Arrow */}
      <div className="flex justify-center mb-6">
        <motion.div
          className="flex flex-col items-center"
          animate={{ opacity: activeStep >= 0 ? 1 : 0.3 }}
        >
          <div className="h-8 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />
          <motion.div
            className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center"
            animate={{ y: activeStep >= 1 ? [0, -5, 0] : 0 }}
            transition={{ duration: 0.5 }}
          >
            <ArrowDown className="w-4 h-4 text-blue-400" />
          </motion.div>
        </motion.div>
      </div>

      {/* Flow Steps */}
      <div className="space-y-4">
        {flowSteps.map((step, index) => (
          <motion.div
            key={step.id}
            className={`
              rounded-2xl border-2 transition-all duration-500 overflow-hidden
              ${index <= activeStep
                ? `${getColorClasses(step.color, 'border')} ${getColorClasses(step.color, 'bg')}`
                : 'border-white/10 bg-white/[0.02]'}
            `}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: 1,
              x: 0,
              scale: index === activeStep ? 1.02 : 1
            }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onClick={() => setActiveStep(index)}
          >
            <div className="p-4 cursor-pointer">
              <div className="flex items-center gap-4">
                {/* Step Number */}
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                  ${index <= activeStep
                    ? `${getColorClasses(step.color, 'bg')} ${getColorClasses(step.color, 'text')} border ${getColorClasses(step.color, 'border')}`
                    : 'bg-white/5 text-text-muted border border-white/10'}
                `}>
                  {step.step}
                </div>

                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  ${index <= activeStep
                    ? `${getColorClasses(step.color, 'bg')} border ${getColorClasses(step.color, 'border')}`
                    : 'bg-white/5 border border-white/10'}
                `}>
                  <step.icon className={`w-6 h-6 ${index <= activeStep ? getColorClasses(step.color, 'text') : 'text-text-muted'}`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${index <= activeStep ? 'text-white' : 'text-text-muted'}`}>
                      {step.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      index <= activeStep
                        ? `${getColorClasses(step.color, 'bg')} ${getColorClasses(step.color, 'text')}`
                        : 'bg-white/5 text-text-muted'
                    }`}>
                      {step.subtitle}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${index <= activeStep ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {step.entity}
                  </p>
                </div>

                {/* Expand Arrow */}
                <motion.div
                  animate={{ rotate: index === activeStep ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className={`w-5 h-5 ${index <= activeStep ? getColorClasses(step.color, 'text') : 'text-text-muted'}`} />
                </motion.div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {index === activeStep && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-white/10">
                      <p className="text-sm text-text-secondary mb-4">{step.description}</p>

                      {/* Journal Entry (for step 1) */}
                      {step.journalEntry && (
                        <div className="space-y-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowJournal(!showJournal); }}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            {showJournal ? 'Hide' : 'Show'} Journal Entry
                          </button>
                          <AnimatePresence>
                            {showJournal && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-black/30 rounded-lg p-3 font-mono text-xs overflow-hidden"
                              >
                                <div className="text-green-400 mb-1">Debit:</div>
                                <div className="pl-4 text-white mb-2">{step.journalEntry.debit}</div>
                                <div className="text-red-400 mb-1">Credit:</div>
                                {step.journalEntry.credit.map((credit, i) => (
                                  <div key={i} className="pl-4 text-white">{credit}</div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Connecting Line to Next Step */}
            {index < flowSteps.length - 1 && index < activeStep && (
              <motion.div
                className="flex justify-center pb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className={`h-4 w-0.5 ${
                  index < activeStep ? 'bg-gradient-to-b from-green-500/50 to-transparent' : 'bg-white/10'
                }`} />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Final Destination */}
      <motion.div
        className="mt-8 text-center"
        animate={{ opacity: activeStep === flowSteps.length - 1 ? 1 : 0.5 }}
      >
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/50">
          <Wallet className="w-8 h-8 text-emerald-400" />
          <div className="text-left">
            <p className="text-lg font-bold text-white">Owner Distributions</p>
            <p className="text-sm text-text-secondary">After-tax profits to founders/investors</p>
          </div>
        </div>
      </motion.div>

      {/* Key Insight */}
      <motion.div
        className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Critical Tax Insight</h4>
            <p className="text-xs text-text-secondary">
              Client royalties are <span className="text-blue-400 font-medium">never your revenue</span>. They are
              custodial funds (trust liabilities). Only your admin commission becomes taxable income - and because
              Producer Tour LLC is a <span className="text-emerald-400 font-medium">Florida LLC with $0 state income tax</span>,
              you only pay federal tax. Stack deductions via Ops and IP LLC payments to minimize that further.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
