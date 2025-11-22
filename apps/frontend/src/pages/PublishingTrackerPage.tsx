import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LucideIcon, BarChart3, Music, FileText, Link, TrendingUp, Shield } from 'lucide-react';

interface Producer {
  id: number;
  name: string;
  genre: string;
  stats: Array<{ label: string; value: string }>;
  accomplishment: string;
  image?: string;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

export default function PublishingTrackerPage() {
  const navigate = useNavigate();
  const [currentProducerIdx, setCurrentProducerIdx] = useState(0);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Sample producer data - TODO: Fetch from backend API
  const producers: Producer[] = [
    {
      id: 1,
      name: 'Alex Rivera',
      genre: 'Hip-Hop / Trap',
      stats: [
        { label: 'Total Placements', value: '248' },
        { label: 'Monthly Streams', value: '2.4M' },
        { label: 'Published Tracks', value: '156' },
      ],
      accomplishment:
        'Successfully placed music across major DSPs including Spotify, Apple Music, and Amazon Music. Collaborations with top 50 artists in the industry.',
    },
    {
      id: 2,
      name: 'Sam Chen',
      genre: 'Electronic / Ambient',
      stats: [
        { label: 'Total Placements', value: '189' },
        { label: 'Monthly Streams', value: '1.8M' },
        { label: 'Published Tracks', value: '124' },
      ],
      accomplishment:
        'Established strong presence in cinematic and sync markets. Featured in Netflix original series and major film soundtracks.',
    },
  ];

  const features: Feature[] = [
    {
      icon: BarChart3,
      title: 'Real-Time Publishing Dashboard',
      description: 'Monitor your placements, credits, and publishing data all in one centralized location.',
    },
    {
      icon: Music,
      title: 'Placement Management',
      description:
        'Organize and track all your music placements across streaming platforms and sync opportunities.',
    },
    {
      icon: FileText,
      title: 'Credit Organization',
      description: 'Maintain accurate credits and metadata for all your published works.',
    },
    {
      icon: Link,
      title: 'Publishing Submissions',
      description: 'Submit your publishing data directly to PROs and collection societies.',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Deep dive into your performance metrics and earnings potential.',
    },
    {
      icon: Shield,
      title: 'Rights Management',
      description: 'Protect your intellectual property with comprehensive rights tracking.',
    },
  ];

  const faqs: FAQItem[] = [
    {
      question: 'How do I add a new placement to the tracker?',
      answer:
        'Navigate to the "New Placement" button on the dashboard. Fill in the song details, platform, and publishing information. Our system will automatically sync with major DSPs.',
    },
    {
      question: 'Can I export my publishing data?',
      answer:
        'Yes! You can export all your publishing data in multiple formats (CSV, PDF, Excel) directly from the dashboard. This is useful for submissions to PROs and royalty collection agencies.',
    },
    {
      question: 'How often is the data updated?',
      answer:
        'Our dashboard updates in real-time for manually entered data. DSP and streaming data syncs every 24 hours automatically.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Absolutely. We use industry-standard encryption and security protocols. All your publishing data is backed up and protected.',
    },
  ];

  const nextProducer = () => {
    setCurrentProducerIdx((prev) => (prev + 1) % producers.length);
  };

  const prevProducer = () => {
    setCurrentProducerIdx((prev) => (prev - 1 + producers.length) % producers.length);
  };

  const producer = producers[currentProducerIdx];

  return (
    <div className="min-h-screen text-white" style={{
      background: 'linear-gradient(135deg, #020617 0%, #0b1120 48%, #111827 100%)',
      backgroundImage: `
        linear-gradient(135deg, #020617 0%, #0b1120 48%, #111827 100%),
        radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.16), transparent 55%),
        radial-gradient(circle at 88% 12%, rgba(147, 197, 253, 0.18), transparent 58%)
      `,
      backgroundSize: 'cover',
    }}>
      {/* Back Button */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-300 hover:text-white transition flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 40% -20%, rgba(59, 130, 246, 0.15), transparent 70%),
              radial-gradient(circle at -10% 80%, rgba(147, 197, 253, 0.1), transparent 70%)
            `,
          }}
        />

        <div className="relative z-2 max-w-3xl mx-auto">
          <h1
            className="text-5xl md:text-6xl font-extrabold leading-tight mb-6"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Publishing Tracker
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed">
            Manage placements, organize credits, and submit publishing data from a single dashboard.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition transform hover:scale-105">
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/tools/consultation')}
              className="px-8 py-3 border border-blue-500 text-blue-400 hover:bg-blue-900/20 rounded-lg font-semibold transition"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Producers Carousel */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative z-3">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-3xl p-10 border border-slate-700 relative overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Producer Image Placeholder */}
              <div className="lg:w-80 flex-shrink-0">
                <div
                  className="w-80 h-80 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-6xl shadow-2xl"
                  style={{
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <Music className="w-24 h-24 text-white" />
                </div>
              </div>

              {/* Producer Info */}
              <div className="flex-1">
                <h3 className="text-4xl font-extrabold mb-2">{producer.name}</h3>
                <p className="text-blue-400 font-semibold text-lg mb-6">{producer.genre}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {producer.stats.map((stat, idx) => (
                    <div key={idx}>
                      <div
                        className="text-2xl font-extrabold"
                        style={{
                          background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-400 font-semibold">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Accomplishment */}
                <div
                  className="p-4 rounded-lg border-l-4 border-blue-500"
                  style={{
                    background: 'rgba(60, 130, 246, 0.1)',
                  }}
                >
                  <p className="text-slate-200 italic">{producer.accomplishment}</p>
                </div>
              </div>
            </div>

            {/* Carousel Controls */}
            <div className="flex justify-center items-center gap-8 mt-8">
              <button
                onClick={prevProducer}
                className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500 text-blue-400 hover:bg-blue-600/40 transition flex items-center justify-center text-2xl font-bold"
              >
                ‹
              </button>

              <div className="flex gap-3">
                {producers.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentProducerIdx(idx)}
                    className={`h-3 rounded-full transition ${
                      idx === currentProducerIdx
                        ? 'bg-blue-500 w-8'
                        : 'bg-slate-600 w-3 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextProducer}
                className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500 text-blue-400 hover:bg-blue-600/40 transition flex items-center justify-center text-2xl font-bold"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div
          className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(59, 130, 246, 0.08), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-2">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-300">Everything you need to manage your publishing rights</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-10 rounded-2xl border border-slate-700 hover:border-blue-500 transition transform hover:-translate-y-2 cursor-pointer"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="text-5xl mb-4"><feature.icon className="w-12 h-12 text-blue-400" /></div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div
          className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(147, 197, 253, 0.08), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="max-w-4xl mx-auto relative z-2">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-300">Get answers to common questions about our platform</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-700 rounded-lg overflow-hidden"
                style={{
                  background:
                    expandedFAQ === idx
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.6))'
                      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                }}
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-900/20 transition"
                >
                  <h3 className="font-semibold text-lg">{faq.question}</h3>
                  <span
                    className="text-blue-400 text-2xl transition transform"
                    style={{
                      transform: expandedFAQ === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                </button>

                {expandedFAQ === idx && (
                  <div className="px-6 pb-4 text-slate-300 border-t border-slate-700/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative z-2">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-6">Ready to Take Control of Your Publishing?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join hundreds of producers managing their publishing data with confidence.
          </p>
          <button className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition transform hover:scale-105">
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
}