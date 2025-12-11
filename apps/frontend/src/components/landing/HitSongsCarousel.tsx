import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, ExternalLink, Music2 } from 'lucide-react';
import { Container, Section } from './ui';
import { ScrollReveal } from './animations';

export interface HitSong {
  id: string;
  title: string;
  artist: string;
  producer: string;
  spotifyId?: string;
  coverArt?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  streams?: string;
  gradient: string;
}

// Static data - will be enhanced with Spotify API data
export const hitSongsData: HitSong[] = [
  {
    id: '1',
    title: 'Special K',
    artist: 'Kosher',
    producer: 'Producer Tour Member',
    gradient: 'from-purple-600 to-pink-500',
    streams: '2.5M+',
  },
  {
    id: '2',
    title: 'Get In With Me',
    artist: 'Bossman Dlow',
    producer: 'Producer Tour Member',
    gradient: 'from-blue-600 to-cyan-500',
    streams: '150M+',
  },
  {
    id: '3',
    title: 'Come Outside',
    artist: 'Icewear Vezzo',
    producer: 'Producer Tour Member',
    gradient: 'from-green-600 to-emerald-500',
    streams: '5M+',
  },
  {
    id: '4',
    title: 'Gangsta Groove',
    artist: 'Bayflogo',
    producer: 'Producer Tour Member',
    gradient: 'from-red-600 to-orange-500',
    streams: '1M+',
  },
  {
    id: '5',
    title: 'Pink Molly',
    artist: 'YTB Fatt & Loe Shimmy',
    producer: 'Producer Tour Member',
    gradient: 'from-pink-600 to-rose-500',
    streams: '3M+',
  },
  {
    id: '6',
    title: 'Pressure',
    artist: 'Bossman Dlow',
    producer: 'Producer Tour Member',
    gradient: 'from-amber-600 to-yellow-500',
    streams: '80M+',
  },
  {
    id: '7',
    title: 'OG Crashout',
    artist: 'Bhad Baby',
    producer: 'Producer Tour Member',
    gradient: 'from-indigo-600 to-violet-500',
    streams: '500K+',
  },
];

// Stream count data (not available via Spotify API)
const streamCounts: Record<string, string> = {
  'Special K': '2.5M+',
  'Get In With Me': '150M+',
  'Come Outside': '5M+',
  'Gangsta Groove': '1M+',
  'Pink Molly': '3M+',
  'Pressure': '80M+',
  'OG Crashout': '500K+',
  'OG CRASHOUT': '500K+',
};

export function HitSongsCarousel() {
  const [songs, setSongs] = useState<HitSong[]>(hitSongsData);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setIsLoading] = useState(true);

  // Fetch songs from Spotify API
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
        const response = await fetch(`${apiUrl}/api/spotify/hit-songs`);
        const data = await response.json();

        if (data.success && data.songs) {
          // Merge API data with stream counts
          const songsWithStreams = data.songs.map((song: HitSong) => ({
            ...song,
            streams: streamCounts[song.title] || undefined,
          }));
          setSongs(songsWithStreams);
        }
      } catch (error) {
        console.error('Failed to fetch hit songs:', error);
        // Keep using static data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      skipSnaps: false,
    },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <Section padding="lg" className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/[0.03] to-transparent" />

      <Container className="relative">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
              <Music2 className="w-4 h-4" />
              Real Hits, Real Royalties
            </div>
            <h2 className="text-display-md md:text-display-lg text-white mb-4">
              Meet Our Community
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              These hits were made by producers in the Producer Tour community. Now they're collecting every royalty they're owed.
            </p>
          </div>
        </ScrollReveal>

        {/* Embla Carousel */}
        <div className="relative max-w-5xl mx-auto">
          {/* Viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-4">
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex-[0_0_100%] min-w-0 pl-4"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: selectedIndex === index ? 1 : 0.4,
                      scale: selectedIndex === index ? 1 : 0.92,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row min-h-[420px] md:min-h-[360px]">
                      {/* Album Art Side */}
                      <div className="md:w-2/5 relative">
                        <div
                          className={`h-52 md:h-full w-full bg-gradient-to-br ${song.gradient} flex items-center justify-center relative`}
                        >
                          {song.coverArt ? (
                            <img
                              src={song.coverArt}
                              alt={`${song.title} cover`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <Music2 className="w-24 h-24 text-white/20 mx-auto mb-2" />
                            </div>
                          )}

                          {/* Play button overlay - opens Spotify since previews aren't available */}
                          {song.spotifyUrl && (
                            <a
                              href={song.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity cursor-pointer opacity-0 hover:opacity-100"
                            >
                              <div className="w-16 h-16 rounded-full bg-[#1DB954]/80 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-all">
                                <Play className="w-8 h-8 text-white ml-1" />
                              </div>
                            </a>
                          )}
                        </div>
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-100/90 via-surface-100/20 to-transparent pointer-events-none" />
                      </div>

                      {/* Content Side */}
                      <div className="md:w-3/5 p-6 md:p-10 flex flex-col justify-center">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                            Producer Tour Hit
                          </span>
                          {song.streams && (
                            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-brand-blue/20 text-brand-blue">
                              {song.streams} Streams
                            </span>
                          )}
                        </div>

                        {/* Song Title */}
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                          {song.title}
                        </h3>

                        {/* Artist */}
                        <p className="text-xl text-text-secondary mb-4">
                          {song.artist}
                        </p>

                        {/* Producer Credit */}
                        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 mb-6 w-fit">
                          <span className="text-text-muted text-sm">Produced by</span>
                          <span className="text-white font-medium">{song.producer}</span>
                        </div>

                        {/* CTA */}
                        <div className="flex flex-wrap gap-3">
                          {song.spotifyUrl && (
                            <a
                              href={song.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954] text-white text-sm font-medium hover:bg-[#1ed760] transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                              Listen on Spotify
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <a
                            href="/apply"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/10"
                          >
                            Join Producer Tour
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:border-white/20 transition-all z-10"
            aria-label="Previous song"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:border-white/20 transition-all z-10"
            aria-label="Next song"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {songs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => scrollTo(index)}
                className="relative group transition-all duration-300"
                aria-label={`Go to ${song.title}`}
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${song.gradient} flex items-center justify-center overflow-hidden transition-all duration-300 ${
                    index === selectedIndex
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                      : 'opacity-40 hover:opacity-70 scale-100'
                  }`}
                >
                  {song.coverArt ? (
                    <img src={song.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-5 h-5 text-white/50" />
                  )}
                </div>
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 backdrop-blur-sm rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  {song.title}
                </div>
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex justify-center mt-6">
            <div className="flex gap-1.5">
              {songs.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === selectedIndex ? 'w-8 bg-brand-blue' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={0.2}>
          <div className="text-center mt-12">
            <p className="text-text-muted text-sm mb-4">
              Your production could be next. Start collecting your royalties today.
            </p>
            <a
              href="/apply"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-blue text-white font-medium hover:bg-brand-blue/90 transition-colors"
            >
              Get Started
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
