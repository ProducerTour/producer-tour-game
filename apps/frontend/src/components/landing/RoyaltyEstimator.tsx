import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, DollarSign, Music2, Youtube, Radio } from 'lucide-react';
import { Container, Section } from './ui';
import { ScrollReveal } from './animations';

// Royalty rate estimates (simplified for demo)
const RATES = {
  spotify: 0.004, // ~$0.004 per stream
  youtube: 0.002, // ~$0.002 per view (music content)
  appleMusic: 0.008, // ~$0.008 per stream
  radio: 0.10, // ~$0.10 per spin (varies widely)
};

// What percentage most producers are actually collecting
const COLLECTION_RATE = 0.35; // Most collect only ~35% of what they're owed

export function RoyaltyEstimator() {
  const [spotifyStreams, setSpotifyStreams] = useState(100000);
  const [youtubeViews, setYoutubeViews] = useState(50000);
  const [appleStreams, setAppleStreams] = useState(25000);
  const [radioSpins, setRadioSpins] = useState(100);

  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [animatedMissed, setAnimatedMissed] = useState(0);

  // Calculate royalties
  const spotifyRoyalties = spotifyStreams * RATES.spotify;
  const youtubeRoyalties = youtubeViews * RATES.youtube;
  const appleRoyalties = appleStreams * RATES.appleMusic;
  const radioRoyalties = radioSpins * RATES.radio;

  const totalPotential = spotifyRoyalties + youtubeRoyalties + appleRoyalties + radioRoyalties;
  const currentlyCollecting = totalPotential * COLLECTION_RATE;
  const missedRoyalties = totalPotential - currentlyCollecting;

  // Animate numbers
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedTotal(totalPotential * eased);
      setAnimatedMissed(missedRoyalties * eased);

      if (step >= steps) clearInterval(interval);
    }, stepTime);

    return () => clearInterval(interval);
  }, [totalPotential, missedRoyalties]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <Section padding="xl" className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-50/50 to-surface" />

      <Container className="relative">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-sm font-medium mb-6">
              <Calculator className="w-4 h-4" />
              Interactive Tool
            </div>
            <h2 className="text-display-md md:text-display-lg text-white mb-4">
              How Much Are You <span className="text-red-400">Missing</span>?
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Enter your streaming numbers to see your potential royalties — and how much you might be leaving on the table.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Input Side */}
          <ScrollReveal delay={0.1}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
              <h3 className="text-lg font-semibold text-white mb-6">Your Monthly Numbers</h3>

              <div className="space-y-6">
                {/* Spotify */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1DB954]/20 flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-[#1DB954]" />
                      </div>
                      <span className="text-sm text-white">Spotify Streams</span>
                    </div>
                    <span className="text-sm font-mono text-text-secondary">{formatNumber(spotifyStreams)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000000"
                    step="10000"
                    value={spotifyStreams}
                    onChange={(e) => setSpotifyStreams(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954]"
                  />
                </div>

                {/* YouTube */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FF0000]/20 flex items-center justify-center">
                        <Youtube className="w-4 h-4 text-[#FF0000]" />
                      </div>
                      <span className="text-sm text-white">YouTube Views</span>
                    </div>
                    <span className="text-sm font-mono text-text-secondary">{formatNumber(youtubeViews)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000000"
                    step="10000"
                    value={youtubeViews}
                    onChange={(e) => setYoutubeViews(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF0000]"
                  />
                </div>

                {/* Apple Music */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FC3C44]/20 flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-[#FC3C44]" />
                      </div>
                      <span className="text-sm text-white">Apple Music Streams</span>
                    </div>
                    <span className="text-sm font-mono text-text-secondary">{formatNumber(appleStreams)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="5000"
                    value={appleStreams}
                    onChange={(e) => setAppleStreams(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FC3C44]"
                  />
                </div>

                {/* Radio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/20 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-brand-blue" />
                      </div>
                      <span className="text-sm text-white">Radio Spins</span>
                    </div>
                    <span className="text-sm font-mono text-text-secondary">{formatNumber(radioSpins)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={radioSpins}
                    onChange={(e) => setRadioSpins(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Results Side */}
          <ScrollReveal delay={0.2}>
            <div className="space-y-4">
              {/* Total Potential */}
              <motion.div
                className="rounded-3xl border border-green-500/20 bg-green-500/5 p-6"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-text-secondary text-sm">Total Potential Royalties</span>
                </div>
                <p className="text-4xl md:text-5xl font-bold text-green-400">
                  {formatCurrency(animatedTotal)}
                </p>
                <p className="text-xs text-text-muted mt-2">per month with full collection</p>
              </motion.div>

              {/* What You're Missing */}
              <motion.div
                className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-text-secondary text-sm">You're Probably Missing</span>
                </div>
                <p className="text-4xl md:text-5xl font-bold text-red-400">
                  {formatCurrency(animatedMissed)}
                </p>
                <p className="text-xs text-text-muted mt-2">most producers only collect ~35% of owed royalties</p>
              </motion.div>

              {/* CTA */}
              <motion.div
                className="rounded-3xl border border-brand-blue/20 bg-brand-blue/5 p-6 text-center"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-white font-medium mb-4">
                  Stop leaving money on the table.
                </p>
                <a
                  href="/apply"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-blue text-white font-medium hover:bg-brand-blue/90 transition-colors"
                >
                  Start Collecting Everything
                  <TrendingUp className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </ScrollReveal>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-text-muted mt-8 max-w-2xl mx-auto">
          * Estimates based on industry average royalty rates. Actual royalties vary by territory,
          contract terms, and PRO agreements. Producer Tour helps you collect from all sources.
        </p>
      </Container>
    </Section>
  );
}
