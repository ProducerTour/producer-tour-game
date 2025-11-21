import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Container, Section } from './ui';
import { ScrollReveal } from './animations';
import { producersData } from './data';

export function ProducersCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % producersData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + producersData.length) % producersData.length);
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % producersData.length);
  };

  const currentProducer = producersData[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <Section padding="lg" className="relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/[0.02] to-transparent" />

      <Container className="relative">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-text-muted text-sm uppercase tracking-wider mb-4">
              Trusted by Independent Producers
            </p>
            <h2 className="text-display-md md:text-display-lg text-white">
              Meet Our Community
            </h2>
          </div>
        </ScrollReveal>

        {/* Carousel Container */}
        <div className="relative max-w-4xl mx-auto">
          {/* Main Card */}
          <div className="relative h-[400px] md:h-[350px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute inset-0"
              >
                <div className="h-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row h-full">
                    {/* Image/Avatar Side */}
                    <div className="md:w-2/5 relative">
                      <div
                        className="h-48 md:h-full w-full"
                        style={{
                          background: currentProducer.image
                            ? `url(${currentProducer.image}) center/cover no-repeat`
                            : `linear-gradient(${currentProducer.gradient})`
                        }}
                      >
                        {!currentProducer.image && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl font-bold text-white/20">
                              {currentProducer.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-100/80 via-transparent to-transparent" />
                    </div>

                    {/* Content Side */}
                    <div className="md:w-3/5 p-6 md:p-10 flex flex-col justify-center">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-text-secondary">
                            {currentProducer.genre}
                          </span>
                          {currentProducer.joinedYear && (
                            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                              Member since {currentProducer.joinedYear}
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                          {currentProducer.name}
                        </h3>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 mb-4">
                        {currentProducer.stats.map((stat) => (
                          <div key={stat.label}>
                            <p className="text-2xl font-bold text-brand-blue">{stat.value}</p>
                            <p className="text-xs text-text-muted">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Earnings Increase Badge */}
                      {currentProducer.earningsIncrease && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 mb-4 w-fit">
                          <span className="text-green-400 font-bold text-lg">{currentProducer.earningsIncrease}</span>
                          <span className="text-green-400/70 text-sm">earnings increase</span>
                        </div>
                      )}

                      {/* Accomplishment */}
                      <p className="text-text-secondary text-sm leading-relaxed">
                        "{currentProducer.accomplishment}"
                      </p>

                      {/* Top Track (if available) */}
                      {currentProducer.topTrack && (
                        <p className="text-xs text-text-muted mt-3">
                          Top Track: <span className="text-white">{currentProducer.topTrack}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:border-white/20 transition-all z-10"
            aria-label="Previous producer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 hover:border-white/20 transition-all z-10"
            aria-label="Next producer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {producersData.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-brand-blue'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
