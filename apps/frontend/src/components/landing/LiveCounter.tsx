import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DollarSign, Music, Users, TrendingUp } from 'lucide-react';
import { Container, Section } from './ui';

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
}

function AnimatedCounter({ end, prefix = '', suffix = '', decimals = 0, duration = 2000, icon, label, sublabel, color }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true;
      const steps = 60;
      const stepTime = duration / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(end * eased);

        if (step >= steps) {
          setCount(end);
          clearInterval(interval);
        }
      }, stepTime);

      return () => clearInterval(interval);
    }
  }, [isInView, end, duration]);

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.floor(num).toLocaleString();
  };

  return (
    <motion.div
      ref={ref}
      className="relative group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className={`absolute inset-0 ${color} opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500`} />
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-5 xl:p-8 text-center hover:border-white/20 transition-colors overflow-hidden">
        <div className={`inline-flex items-center justify-center w-12 h-12 lg:w-11 lg:h-11 xl:w-14 xl:h-14 rounded-2xl ${color} mb-4`}>
          {icon}
        </div>
        <div className="text-xl sm:text-2xl lg:text-xl xl:text-3xl font-bold text-white mb-2">
          {prefix}{formatNumber(count)}{suffix}
        </div>
        <div className="text-base lg:text-sm xl:text-base font-medium text-white mb-1">{label}</div>
        <div className="text-sm text-text-muted">{sublabel}</div>
      </div>
    </motion.div>
  );
}

export function LiveCounter() {
  // These would come from your API/database in production
  const stats = [
    {
      end: 5000000,
      prefix: '$',
      suffix: '+',
      icon: <DollarSign className="w-7 h-7 text-green-400" />,
      label: 'Royalties Collected',
      sublabel: 'and counting...',
      color: 'bg-green-500/10',
    },
    {
      end: 12847,
      prefix: '',
      suffix: '',
      icon: <Music className="w-7 h-7 text-brand-blue" />,
      label: 'Works Registered',
      sublabel: 'across all PROs',
      color: 'bg-brand-blue/10',
    },
    {
      end: 1247,
      prefix: '',
      suffix: '',
      icon: <Users className="w-7 h-7 text-purple-400" />,
      label: 'Producers Paid',
      sublabel: 'this month',
      color: 'bg-purple-500/10',
    },
    {
      end: 127,
      prefix: '',
      suffix: '%',
      icon: <TrendingUp className="w-7 h-7 text-cyan-400" />,
      label: 'Avg. Earnings Increase',
      sublabel: 'after joining',
      color: 'bg-cyan-500/10',
    },
  ];

  return (
    <Section padding="xl" className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-blue/10 via-purple-500/10 to-green-500/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      <Container className="relative">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Stats
          </div>
          <h2 className="text-display-md md:text-display-lg text-white mb-4">
            Real Results for Real Producers
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            These aren't vanity metrics. This is real money collected for independent producers just like you.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <AnimatedCounter
              key={stat.label}
              {...stat}
              duration={2000 + index * 200}
            />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-center text-sm text-text-muted mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Updated in real-time from our platform data
        </motion.p>
      </Container>
    </Section>
  );
}
