import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Music2, FileText, Calculator, Users, Video, Target, Award, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/landing';

const BEAT = 0.15;

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
    icon: Zap,
    features: ['Catalog valuation', 'Market comparisons', 'Deal insights'],
  },
];

export default function PricingPage() {
  useEffect(() => {
    document.title = 'Pricing - Producer Tour';

    const setMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMetaTag('og:title', 'Pricing - Producer Tour');
    setMetaTag('og:description', 'Simple, transparent pricing for music producers. Choose the plan that fits your needs - from free tools to full publishing admin solutions.');
    setMetaTag('og:image', '/og-image.png');
    setMetaTag('og:type', 'website');
    setMetaTag('og:url', window.location.href);

    const setTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setTwitterMeta('twitter:card', 'summary_large_image');
    setTwitterMeta('twitter:title', 'Pricing - Producer Tour');
    setTwitterMeta('twitter:description', 'Simple, transparent pricing for music producers. Choose the plan that fits your needs.');
    setTwitterMeta('twitter:image', '/og-image.png');

    return () => {
      document.title = 'Producer Tour';
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="pt-0 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-28">
          {/* Noise texture overlay */}
          <div
            className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="max-w-6xl mx-auto px-4 relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 text-[#f0e226] text-sm font-medium uppercase tracking-wider mb-6">
                <Zap className="w-4 h-4" />
                Simple Pricing
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Choose the plan that{' '}
                <span className="text-[#f0e226]">fits your needs</span>
              </h1>
              <p className="text-xl text-white/60 max-w-2xl mx-auto">
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
                  transition={{ duration: 0.5, delay: index * BEAT }}
                  whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(240, 226, 38, 0.15)' }}
                  className="relative"
                >
                  <div
                    className={`h-full bg-[#19181a] border ${
                      plan.featured ? 'border-[#f0e226]' : 'border-white/10'
                    } p-8 relative overflow-hidden transition-all duration-300`}
                  >
                    {/* Featured badge */}
                    {plan.featured && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 text-xs font-semibold bg-[#f0e226] text-black uppercase tracking-wider">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      {/* Icon */}
                      <div className="w-12 h-12 border border-white/20 flex items-center justify-center mb-6">
                        <plan.icon className="w-6 h-6 text-[#f0e226]" />
                      </div>

                      {/* Plan name & description */}
                      <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">{plan.name}</h3>
                      <p className="text-white/60 text-sm mb-6">{plan.description}</p>

                      {/* Price */}
                      <div className="mb-8">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        {plan.priceSubtext && (
                          <span className="text-white/40 ml-1">{plan.priceSubtext}</span>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                              <Check className="w-4 h-4 text-[#f0e226]" />
                            </div>
                            <span className="text-white/60 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Link
                        to={plan.ctaLink}
                        className={`block w-full text-center py-3.5 px-6 font-semibold uppercase tracking-wider transition-all duration-300 ${
                          plan.featured
                            ? 'bg-[#f0e226] text-black hover:bg-white'
                            : 'border border-[#f0e226] text-[#f0e226] hover:bg-[#f0e226] hover:text-black'
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
                <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-wide">Individual Tools</h2>
                <p className="text-white/60 max-w-xl mx-auto">
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
                    whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(240, 226, 38, 0.1)' }}
                    className="bg-[#19181a] border border-white/10 p-6 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="w-10 h-10 border border-white/20 flex items-center justify-center mb-4">
                      <tool.icon className="w-5 h-5 text-[#f0e226]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{tool.description}</p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-white">{tool.price}</span>
                      <span className="text-white/40 text-sm">{tool.period}</span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tool.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-white/60">
                          <Check className="w-4 h-4 text-[#f0e226]" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/login"
                      className="block w-full text-center py-2.5 px-4 border border-white/20 text-white text-sm font-medium uppercase tracking-wider hover:border-[#f0e226] hover:text-[#f0e226] transition-all duration-300"
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
                <span className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 text-[#f0e226] text-sm font-medium uppercase tracking-wider mb-4">
                  <Award className="w-4 h-4" />
                  Always Free
                </span>
                <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-wide">Free Tools</h2>
                <p className="text-white/60 max-w-xl mx-auto">
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
                    whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(240, 226, 38, 0.1)' }}
                    className="bg-[#19181a] border border-[#f0e226]/20 p-6 hover:border-[#f0e226]/50 transition-all duration-300"
                  >
                    <div className="w-10 h-10 border border-white/20 flex items-center justify-center mb-4">
                      <tool.icon className="w-5 h-5 text-[#f0e226]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{tool.description}</p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-[#f0e226]">Free</span>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tool.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-white/60">
                          <Check className="w-4 h-4 text-[#f0e226]" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/login"
                      className="block w-full text-center py-2.5 px-4 bg-[#f0e226]/10 border border-white/20 text-[#f0e226] text-sm font-medium uppercase tracking-wider hover:bg-[#f0e226] hover:text-black transition-all duration-300"
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
              <div className="bg-[#19181a] border border-white/10 p-8 md:p-12 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">Have questions?</h3>
                <p className="text-white/60 mb-6">
                  Check out our FAQ or get in touch with our team for personalized assistance.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/#faq"
                    className="px-6 py-3 border border-white/20 text-white font-medium uppercase tracking-wider hover:border-[#f0e226] hover:text-[#f0e226] transition-all duration-300"
                  >
                    View FAQ
                  </Link>
                  <Link
                    to="/apply"
                    className="px-6 py-3 bg-[#f0e226] text-black font-semibold uppercase tracking-wider hover:bg-white transition-all duration-300"
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
