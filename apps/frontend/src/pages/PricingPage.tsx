import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Music2, FileText, Calculator, Users, Video, Target, Award, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/landing';

const mainPlans = [
  {
    name: 'For Publishing Admins',
    description: 'Essential tools for managing music publishing operations',
    price: 'Contact Us',
    priceSubtext: 'Custom pricing for teams',
    features: [
      'Metadata Index Tool',
      'Pub Deal Simulator',
      'Advance Estimator',
      'Song Metadata Adjustment',
      'Priority Support',
      'Team Management',
    ],
    cta: 'Contact Sales',
    ctaLink: '/apply',
    featured: false,
    icon: FileText,
    gradient: 'from-brand-blue/20 to-purple-500/20',
  },
  {
    name: 'For Creators',
    description: 'Everything you need to grow your music career',
    price: '$29',
    priceSubtext: '/month',
    features: [
      'Type Beat Video Uploader with Bulk Scheduling',
      'Opportunities Portal',
      'Pub Deal Simulator',
      'Advance Estimator',
      'Metadata Index Tool',
      'Song Metadata Adjustment',
      'My Tour Profile',
      'Premium Discord Roles',
      'Access to Producer Tour Events',
    ],
    cta: 'Get Started',
    ctaLink: '/login',
    featured: true,
    icon: Music2,
    gradient: 'from-green-500/20 to-brand-blue/20',
  },
];

const individualTools = [
  {
    name: 'Type Beat Video Uploader',
    description: 'Bulk upload and schedule type beat videos across platforms',
    price: '$15',
    period: '/month',
    icon: Video,
    features: ['Bulk scheduling', 'Multi-platform support', 'Analytics dashboard'],
  },
  {
    name: 'Opportunities Portal',
    description: 'Access exclusive placement opportunities and sync licensing deals',
    price: '$12',
    period: '/month',
    icon: Target,
    features: ['Curated opportunities', 'Direct submissions', 'Status tracking'],
  },
  {
    name: 'Song Metadata Adjustment',
    description: 'Fix and optimize your song metadata to ensure proper royalty collection',
    price: '$10',
    period: '/month',
    icon: FileText,
    features: ['Metadata auditing', 'ISRC/ISWC management', 'PRO registration help'],
  },
  {
    name: 'My Tour Profile',
    description: 'Professional producer profile to showcase your work and credits',
    price: '$8',
    period: '/month',
    icon: Users,
    features: ['Custom URL', 'Credit showcase', 'Contact form'],
  },
  {
    name: 'Premium Discord Access',
    description: 'Exclusive roles and channels in the Producer Tour community',
    price: '$5',
    period: '/month',
    icon: MessageSquare,
    features: ['Premium channels', 'Priority support', 'Networking events'],
  },
];

const freeTools = [
  {
    name: 'Metadata Index Tool',
    description: 'Search and explore song metadata from major databases',
    icon: FileText,
    features: ['Song lookup', 'Writer/publisher info', 'Basic export'],
  },
  {
    name: 'Pub Deal Simulator',
    description: 'Simulate different publishing deal structures and see potential earnings',
    icon: Calculator,
    features: ['Deal comparison', 'Royalty splits', 'Advance calculations'],
  },
  {
    name: 'Advance Estimator',
    description: 'Estimate potential publishing advances based on your catalog',
    icon: Sparkles,
    features: ['Catalog valuation', 'Market comparisons', 'Deal insights'],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-0 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px]" />
          </div>

          <div className="max-w-6xl mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Simple, Transparent Pricing
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Choose the plan that{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-green-400">
                  fits your needs
                </span>
              </h1>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Whether you're a creator looking to grow or a publishing admin managing catalogs,
                we have the tools to help you succeed.
              </p>
            </motion.div>

            {/* Main Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
              {mainPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="relative"
                >
                  <div
                    className={`h-full rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border ${
                      plan.featured ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-white/[0.08]'
                    } backdrop-blur-sm p-8 relative overflow-hidden`}
                  >
                    {/* Featured badge */}
                    {plan.featured && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-30`} />

                    <div className="relative">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue to-green-500 flex items-center justify-center mb-6">
                        <plan.icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Plan name & description */}
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-text-secondary text-sm mb-6">{plan.description}</p>

                      {/* Price */}
                      <div className="mb-8">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        {plan.priceSubtext && (
                          <span className="text-text-muted ml-1">{plan.priceSubtext}</span>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                              <Check className="w-3 h-3 text-green-400" />
                            </div>
                            <span className="text-text-secondary text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Link
                        to={plan.ctaLink}
                        className={`block w-full text-center py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 ${
                          plan.featured
                            ? 'bg-white text-surface hover:bg-white/90 hover:shadow-glow-sm'
                            : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Individual Tools Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-24"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Individual Tools</h2>
                <p className="text-text-secondary max-w-xl mx-auto">
                  Pick and choose the tools you need. Mix and match to build your perfect toolkit.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {individualTools.map((tool, index) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6 hover:border-brand-blue/30 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                      <tool.icon className="w-5 h-5 text-brand-blue" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                    <p className="text-text-secondary text-sm mb-4">{tool.description}</p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-white">{tool.price}</span>
                      <span className="text-text-muted text-sm">{tool.period}</span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tool.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                          <Check className="w-4 h-4 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/login"
                      className="block w-full text-center py-2.5 px-4 rounded-lg bg-white/5 text-white text-sm font-medium border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      Get Started
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Free Tools Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-4">
                  <Award className="w-4 h-4" />
                  Always Free
                </span>
                <h2 className="text-3xl font-bold text-white mb-4">Free Tools</h2>
                <p className="text-text-secondary max-w-xl mx-auto">
                  Get started with our free tools. No credit card required.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {freeTools.map((tool, index) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="rounded-xl bg-gradient-to-b from-green-500/[0.08] to-green-500/[0.02] border border-green-500/20 p-6 hover:border-green-500/40 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                      <tool.icon className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                    <p className="text-text-secondary text-sm mb-4">{tool.description}</p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-green-400">Free</span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tool.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                          <Check className="w-4 h-4 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/login"
                      className="block w-full text-center py-2.5 px-4 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30 transition-all duration-300"
                    >
                      Try Free
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* FAQ CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-24 text-center"
            >
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-8 md:p-12 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-4">Have questions?</h3>
                <p className="text-text-secondary mb-6">
                  Check out our FAQ or get in touch with our team for personalized assistance.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/#faq"
                    className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300"
                  >
                    View FAQ
                  </Link>
                  <Link
                    to="/apply"
                    className="px-6 py-3 rounded-xl bg-white text-surface font-semibold hover:bg-white/90 hover:shadow-glow-sm transition-all duration-300"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
