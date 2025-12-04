import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SocialSidebar from '../components/SocialSidebar';
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
    <div className="min-h-screen bg-gray-50">
      <SocialSidebar activePage="insights" />

      <div className="ml-20 max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Industry Insights</h1>
              <p className="text-gray-500">
                Stay current on industry trends and discover where labels scout talent
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-white rounded-xl shadow-sm w-fit mb-6">
          <button
            onClick={() => setViewMode('feed')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'feed'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Latest News
          </button>
          <button
            onClick={() => setViewMode('sources')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              viewMode === 'sources'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
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
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className={isActive ? 'text-purple-600' : 'text-gray-400'}>{config.icon}</span>
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
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Articles Yet</h3>
                <p className="text-gray-500">
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
                      <span className="text-purple-600">{config.icon}</span>
                      <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
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
    <div className={`group relative overflow-hidden bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${
      article.isPinned ? 'ring-2 ring-purple-500/30' : ''
    }`}>
      {/* Thumbnail */}
      {article.imageUrl && (
        <div className="relative w-full h-40 bg-gray-100">
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
              {article.isPinned && <Pin className="w-3.5 h-3.5 text-purple-500" />}
              <span className="text-xs text-gray-500 uppercase tracking-wider">{article.source}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 font-medium hover:text-purple-600 transition-colors line-clamp-2"
            >
              {article.title}
            </a>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-400 hover:text-purple-500" />
          </a>
        </div>
        {article.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{article.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
            {article.category}
          </span>
          {publishedDate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
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
      className="group block bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-gray-900 font-medium group-hover:text-purple-600 transition-colors">
          {source.name}
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-500 transition-colors" />
      </div>
      <p className="text-sm text-gray-500 mb-3">{source.description}</p>
      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
        {source.category}
      </span>
    </a>
  );
}
