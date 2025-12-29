import { useState, useEffect, useCallback } from 'react';
import { Quote, RefreshCw, Heart, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WidgetProps } from '../../../types/productivity.types';

interface QuoteData {
  id: string;
  text: string;
  author: string;
  category: 'music' | 'business' | 'creativity' | 'motivation';
}

/**
 * InspirationalQuotesWidget - Daily motivation and inspiration
 *
 * Features:
 * - Curated quotes about music, business, and creativity
 * - Daily quote with refresh option
 * - Like/favorite quotes
 * - Copy to clipboard
 * - Smooth fade animations
 */
export default function InspirationalQuotesWidget({ config: _config, isEditing }: WidgetProps) {
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Curated quotes collection for music industry professionals
  const quotes: QuoteData[] = [
    // Music Industry
    {
      id: '1',
      text: "Music is the universal language of mankind.",
      author: "Henry Wadsworth Longfellow",
      category: 'music',
    },
    {
      id: '2',
      text: "Where words fail, music speaks.",
      author: "Hans Christian Andersen",
      category: 'music',
    },
    {
      id: '3',
      text: "The only truth is music.",
      author: "Jack Kerouac",
      category: 'music',
    },
    {
      id: '4',
      text: "Music gives a soul to the universe, wings to the mind, flight to the imagination.",
      author: "Plato",
      category: 'music',
    },
    {
      id: '5',
      text: "Without music, life would be a mistake.",
      author: "Friedrich Nietzsche",
      category: 'music',
    },
    {
      id: '6',
      text: "One good thing about music, when it hits you, you feel no pain.",
      author: "Bob Marley",
      category: 'music',
    },
    // Business
    {
      id: '7',
      text: "The way to get started is to quit talking and begin doing.",
      author: "Walt Disney",
      category: 'business',
    },
    {
      id: '8',
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill",
      category: 'business',
    },
    {
      id: '9',
      text: "Don't be afraid to give up the good to go for the great.",
      author: "John D. Rockefeller",
      category: 'business',
    },
    {
      id: '10',
      text: "The best time to plant a tree was 20 years ago. The second best time is now.",
      author: "Chinese Proverb",
      category: 'business',
    },
    {
      id: '11',
      text: "Your most unhappy customers are your greatest source of learning.",
      author: "Bill Gates",
      category: 'business',
    },
    // Creativity
    {
      id: '12',
      text: "Creativity is intelligence having fun.",
      author: "Albert Einstein",
      category: 'creativity',
    },
    {
      id: '13',
      text: "The chief enemy of creativity is good sense.",
      author: "Pablo Picasso",
      category: 'creativity',
    },
    {
      id: '14',
      text: "Every artist was first an amateur.",
      author: "Ralph Waldo Emerson",
      category: 'creativity',
    },
    {
      id: '15',
      text: "You can't use up creativity. The more you use, the more you have.",
      author: "Maya Angelou",
      category: 'creativity',
    },
    {
      id: '16',
      text: "Art is not what you see, but what you make others see.",
      author: "Edgar Degas",
      category: 'creativity',
    },
    // Motivation
    {
      id: '17',
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
      category: 'motivation',
    },
    {
      id: '18',
      text: "Believe you can and you're halfway there.",
      author: "Theodore Roosevelt",
      category: 'motivation',
    },
    {
      id: '19',
      text: "It does not matter how slowly you go as long as you do not stop.",
      author: "Confucius",
      category: 'motivation',
    },
    {
      id: '20',
      text: "The future belongs to those who believe in the beauty of their dreams.",
      author: "Eleanor Roosevelt",
      category: 'motivation',
    },
    {
      id: '21',
      text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
      author: "Zig Ziglar",
      category: 'motivation',
    },
    // Music Industry Specific
    {
      id: '22',
      text: "If you're not making mistakes, then you're not doing anything.",
      author: "John Wooden",
      category: 'business',
    },
    {
      id: '23',
      text: "The music business is a cruel and shallow money trench, a long plastic hallway where thieves and pimps run free.",
      author: "Hunter S. Thompson",
      category: 'music',
    },
    {
      id: '24',
      text: "Music is the strongest form of magic.",
      author: "Marilyn Manson",
      category: 'music',
    },
    {
      id: '25',
      text: "To live a creative life, we must lose our fear of being wrong.",
      author: "Joseph Chilton Pearce",
      category: 'creativity',
    },
  ];

  // Get daily quote based on date (same quote all day)
  const getDailyQuote = useCallback(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const index = dayOfYear % quotes.length;
    return quotes[index];
  }, []);

  // Get random quote
  const getRandomQuote = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  }, []);

  // Initialize with daily quote
  useEffect(() => {
    setCurrentQuote(getDailyQuote());
  }, [getDailyQuote]);

  // Refresh to random quote
  const handleRefresh = () => {
    if (isEditing) return;
    setIsRefreshing(true);
    setIsLiked(false);

    setTimeout(() => {
      let newQuote = getRandomQuote();
      // Make sure we get a different quote
      while (newQuote.id === currentQuote?.id && quotes.length > 1) {
        newQuote = getRandomQuote();
      }
      setCurrentQuote(newQuote);
      setIsRefreshing(false);
    }, 300);
  };

  // Copy quote to clipboard
  const handleCopy = async () => {
    if (!currentQuote || isEditing) return;

    const text = `"${currentQuote.text}" — ${currentQuote.author}`;
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Toggle like
  const handleLike = () => {
    if (isEditing) return;
    setIsLiked(!isLiked);
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      music: 'text-purple-400',
      business: 'text-blue-400',
      creativity: 'text-orange-400',
      motivation: 'text-green-400',
    };
    return colors[category] || 'text-theme-primary';
  };

  const getCategoryBg = (category: string) => {
    const colors: Record<string, string> = {
      music: 'bg-purple-500/20',
      business: 'bg-blue-500/20',
      creativity: 'bg-orange-500/20',
      motivation: 'bg-green-500/20',
    };
    return colors[category] || 'bg-theme-primary/20';
  };

  if (!currentQuote) {
    return (
      <div className="h-full flex items-center justify-center">
        <Quote className="w-8 h-8 text-theme-foreground-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${getCategoryBg(currentQuote.category)} rounded`}>
            <Quote className={`w-3 h-3 ${getCategoryColor(currentQuote.category)}`} />
          </div>
          <span className="text-sm font-medium text-theme-foreground">Daily Quote</span>
        </div>
        <span className={`text-xs capitalize ${getCategoryColor(currentQuote.category)}`}>
          {currentQuote.category}
        </span>
      </div>

      {/* Quote Content */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center px-2"
          >
            {/* Quote Text */}
            <div className="relative">
              <Quote className="absolute -top-2 -left-1 w-4 h-4 text-theme-foreground-muted opacity-30" />
              <p className="text-base leading-relaxed text-theme-foreground italic">
                "{currentQuote.text}"
              </p>
            </div>

            {/* Author */}
            <p className="mt-3 text-sm text-theme-foreground-muted">
              — {currentQuote.author}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
        <div className="flex items-center gap-1">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={isEditing}
            className={`p-1.5 rounded-full transition-colors ${
              isLiked
                ? 'bg-red-500/20 text-red-400'
                : 'hover:bg-white/10 text-theme-foreground-muted'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
            />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={isEditing}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-theme-foreground-muted"
            title="Copy quote"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isEditing || isRefreshing}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-theme-foreground-muted hover:text-theme-foreground hover:bg-white/10 rounded transition-colors"
          title="New quote"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          New Quote
        </button>
      </div>
    </div>
  );
}
