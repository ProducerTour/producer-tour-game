import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SocialSidebar from '../components/SocialSidebar';
import SocialHeader from '../components/SocialHeader';
import {
  ExternalLink,
  TrendingUp,
  Newspaper,
  Music,
  Radio,
  Award,
  BookOpen,
  Loader2,
  Rss,
  Globe,
  Clock,
  Pin,
  ChevronLeft,
} from 'lucide-react';
import { getAuthToken } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ViewMode = 'sources' | 'feed';
type Category = 'all' | 'AGGREGATOR' | 'TASTEMAKERS' | 'DISCOVERY' | 'NEWS' | 'PUBLISHERS';

interface Article {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  source: string;
  category: Exclude<Category, 'all'>;
  publishedAt?: string;
  isPinned: boolean;
}

interface Source {
  name: string;
  url: string;
  description: string;
  category: Exclude<Category, 'all'>;
}

// Static source directory
const sources: Source[] = [
  // Blog Aggregator
  { name: 'Hype Machine', url: 'https://hypem.com', description: 'Tracks trending songs across music blogs', category: 'AGGREGATOR' },
  // Critical Tastemakers
  { name: 'Pitchfork', url: 'https://pitchfork.com', description: 'Critical validation; Indie, Experimental, Rap, Electronic', category: 'TASTEMAKERS' },
  { name: 'The FADER', url: 'https://thefader.com', description: 'Culture, Style, Music - Hip-Hop, R&B, Pop', category: 'TASTEMAKERS' },
  { name: 'NME', url: 'https://nme.com', description: 'UK/Global Indie, Alternative, New Music', category: 'TASTEMAKERS' },
  { name: 'Pigeons & Planes', url: 'https://pigeonsandplanes.com', description: 'Premier tastemaker; Hip-Hop, R&B, Indie', category: 'TASTEMAKERS' },
  // Discovery
  { name: 'Lyrical Lemonade', url: 'https://lyricallemonade.com', description: 'Visual content, producer discoveries', category: 'DISCOVERY' },
  { name: 'On The Radar', url: 'https://www.youtube.com/@OnTheRadarRadio', description: 'Underground hip-hop showcases', category: 'DISCOVERY' },
  { name: 'XXL', url: 'https://xxlmag.com', description: 'Freshman lists, producer spotlights', category: 'DISCOVERY' },
  { name: 'HotNewHipHop', url: 'https://hotnewhiphop.com', description: 'Daily new music coverage', category: 'DISCOVERY' },
  { name: 'Genius', url: 'https://genius.com', description: 'Trending songs, producer credits', category: 'DISCOVERY' },
  { name: 'No Jumper', url: 'https://www.youtube.com/@nojumper', description: 'Artist/producer interviews', category: 'DISCOVERY' },
  { name: 'WorldStar', url: 'https://worldstarhiphop.com', description: 'Viral music content', category: 'DISCOVERY' },
  // News
  { name: 'Billboard', url: 'https://billboard.com', description: 'Charts, metrics, industry news', category: 'NEWS' },
  { name: 'Rolling Stone', url: 'https://rollingstone.com/music', description: 'Culture + emerging talent', category: 'NEWS' },
  { name: 'Music Business Worldwide', url: 'https://musicbusinessworldwide.com', description: 'Label/publisher business', category: 'NEWS' },
  { name: 'Variety Music', url: 'https://variety.com/c/music', description: 'Entertainment industry news', category: 'NEWS' },
  // Publishers
  { name: 'ASCAP', url: 'https://ascap.com/news', description: 'PRO news, songwriter resources', category: 'PUBLISHERS' },
  { name: 'BMI', url: 'https://bmi.com/news', description: 'PRO updates, creator spotlight', category: 'PUBLISHERS' },
  { name: 'The MLC', url: 'https://themlc.com/news', description: 'Mechanical licensing updates', category: 'PUBLISHERS' },
];

const categoryConfig: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: 'All', icon: <TrendingUp className="w-4 h-4" />, color: 'text-theme-primary' },
  AGGREGATOR: { label: 'Aggregator', icon: <Radio className="w-4 h-4" />, color: 'text-theme-primary' },
  TASTEMAKERS: { label: 'Tastemakers', icon: <Award className="w-4 h-4" />, color: 'text-theme-primary' },
  DISCOVERY: { label: 'Discovery', icon: <Music className="w-4 h-4" />, color: 'text-theme-primary' },
  NEWS: { label: 'Industry News', icon: <Newspaper className="w-4 h-4" />, color: 'text-theme-primary' },
  PUBLISHERS: { label: 'Publishers', icon: <BookOpen className="w-4 h-4" />, color: 'text-theme-primary' },
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  // Fetch articles (read-only for non-admins)
  const { data: articlesData, isLoading: loadingArticles } = useQuery({
    queryKey: ['insights-articles', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '50');

      const response = await fetch(`${API_URL}/api/insights/articles?${params}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) {
        if (response.status === 404) return { articles: [], total: 0 };
        throw new Error('Failed to fetch articles');
      }
      return response.json();
    },
    enabled: viewMode === 'feed',
  });

  const articles: Article[] = articlesData?.articles || [];
  const filteredSources = selectedCategory === 'all'
    ? sources
    : sources.filter(s => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-theme-background overflow-x-hidden">
      <SocialSidebar activePage="insights" />

      <div className="sm:ml-20">
        {/* Social Header with search, notifications, updates */}
        <SocialHeader title="Insights" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-24 sm:pb-6">
        {/* Mobile Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="sm:hidden flex items-center gap-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-xl sm:rounded-2xl text-theme-primary-foreground">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-theme-foreground">Industry Insights</h1>
              <p className="text-xs sm:text-base text-theme-foreground-muted hidden sm:block">
                Stay current on industry trends and discover where labels scout talent
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-theme-card rounded-xl border border-theme-border w-fit mb-6">
          <button
            onClick={() => setViewMode('feed')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'feed'
                ? 'bg-theme-primary text-theme-primary-foreground shadow-md'
                : 'text-theme-foreground-secondary hover:bg-theme-background'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Latest News
          </button>
          <button
            onClick={() => setViewMode('sources')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'sources'
                ? 'bg-theme-primary text-theme-primary-foreground shadow-md'
                : 'text-theme-foreground-secondary hover:bg-theme-background'
            }`}
          >
            <Globe className="w-4 h-4" />
            Source Directory
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(categoryConfig) as Category[]).map((cat) => {
            const config = categoryConfig[cat];
            const isActive = selectedCategory === cat;
            const count = viewMode === 'feed'
              ? articles.filter(a => cat === 'all' || a.category === cat).length
              : sources.filter(s => cat === 'all' || s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-theme-primary/15 text-theme-primary border border-theme-primary/30'
                    : 'bg-theme-card text-theme-foreground-secondary hover:bg-theme-background border border-theme-border'
                }`}
              >
                <span className={isActive ? 'text-theme-primary' : 'text-theme-foreground-muted'}>{config.icon}</span>
                {config.label}
                <span className="text-xs opacity-50">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {viewMode === 'feed' ? (
          <div className="space-y-4">
            {loadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 bg-theme-card rounded-2xl border border-theme-border">
                <Rss className="w-12 h-12 text-theme-foreground-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-theme-foreground mb-2">No Articles Yet</h3>
                <p className="text-theme-foreground-muted">
                  Check back later for industry news and updates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles
                  .filter(a => selectedCategory === 'all' || a.category === selectedCategory)
                  .map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {(Object.keys(categoryConfig) as Category[])
              .filter(cat => cat !== 'all')
              .map((cat) => {
                const catSources = filteredSources.filter(s => s.category === cat);
                if (catSources.length === 0 && selectedCategory !== 'all') return null;
                if (catSources.length === 0) return null;
                const config = categoryConfig[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-theme-primary">{config.icon}</span>
                      <h2 className="text-lg font-semibold text-theme-foreground">{config.label}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catSources.map((source) => (
                        <SourceCard key={source.name} source={source} />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`group relative overflow-hidden bg-theme-card border border-theme-border rounded-xl hover:border-theme-border-hover hover:shadow-md transition-all duration-300 ${
      article.isPinned ? 'ring-2 ring-theme-primary/30' : ''
    }`}>
      {/* Thumbnail */}
      {article.imageUrl && (
        <div className="relative w-full h-40 bg-theme-background">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {article.isPinned && <Pin className="w-3.5 h-3.5 text-theme-primary" />}
              <span className="text-xs text-theme-foreground-muted uppercase tracking-wider">{article.source}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-foreground font-medium hover:text-theme-primary transition-colors line-clamp-2"
            >
              {article.title}
            </a>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-theme-background rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-theme-foreground-muted hover:text-theme-primary" />
          </a>
        </div>
        {article.description && (
          <p className="text-sm text-theme-foreground-muted line-clamp-2 mb-3">{article.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-theme-primary bg-theme-primary/10 px-2 py-1 rounded">
            {article.category}
          </span>
          {publishedDate && (
            <span className="text-xs text-theme-foreground-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {publishedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-theme-card border border-theme-border rounded-xl hover:border-theme-border-hover hover:shadow-md p-4 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-theme-foreground font-medium group-hover:text-theme-primary transition-colors">
          {source.name}
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-theme-foreground-muted group-hover:text-theme-primary transition-colors" />
      </div>
      <p className="text-sm text-theme-foreground-muted mb-3">{source.description}</p>
      <span className="text-xs text-theme-primary bg-theme-primary/10 px-2 py-1 rounded">
        {source.category}
      </span>
    </a>
  );
}
