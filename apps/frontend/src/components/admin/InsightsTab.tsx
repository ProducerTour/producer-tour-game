import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ExternalLink,
  TrendingUp,
  Newspaper,
  Music,
  Radio,
  Award,
  BookOpen,
  RefreshCw,
  Pin,
  PinOff,
  EyeOff,
  Plus,
  Loader2,
  Rss,
  Globe,
  Clock,
  X,
} from 'lucide-react';
import { getAuthToken } from '../../lib/api';

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
  isManual: boolean;
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

const InsightsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Cassette theme category colors
  const categoryConfig: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
    all: { label: 'All', icon: <TrendingUp className="w-4 h-4" />, color: 'text-theme-primary' },
    AGGREGATOR: { label: 'Aggregator', icon: <Radio className="w-4 h-4" />, color: 'text-theme-primary' },
    TASTEMAKERS: { label: 'Tastemakers', icon: <Award className="w-4 h-4" />, color: 'text-theme-primary' },
    DISCOVERY: { label: 'Discovery', icon: <Music className="w-4 h-4" />, color: 'text-theme-primary' },
    NEWS: { label: 'Industry News', icon: <Newspaper className="w-4 h-4" />, color: 'text-theme-primary' },
    PUBLISHERS: { label: 'Publishers', icon: <BookOpen className="w-4 h-4" />, color: 'text-theme-primary' },
  };

  // Fetch articles
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

  // Refresh feeds mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/insights/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to refresh feeds');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Refreshed! ${data.newArticles} new articles from ${data.total} sources`);
      queryClient.invalidateQueries({ queryKey: ['insights-articles'] });
    },
    onError: () => toast.error('Failed to refresh feeds'),
  });

  // Seed feeds mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/insights/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to seed feeds');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Feed sources seeded! Click Refresh to fetch articles.');
    },
    onError: () => toast.error('Failed to seed feed sources'),
  });

  // Pin article mutation
  const pinMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`${API_URL}/api/insights/articles/${articleId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to pin article');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.isPinned ? 'Article pinned!' : 'Article unpinned');
      queryClient.invalidateQueries({ queryKey: ['insights-articles'] });
    },
    onError: () => toast.error('Failed to pin article'),
  });

  // Hide article mutation
  const hideMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`${API_URL}/api/insights/articles/${articleId}/hide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to hide article');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Article hidden');
      queryClient.invalidateQueries({ queryKey: ['insights-articles'] });
    },
    onError: () => toast.error('Failed to hide article'),
  });

  const articles: Article[] = articlesData?.articles || [];
  const filteredSources = selectedCategory === 'all'
    ? sources
    : sources.filter(s => s.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-theme-foreground">Industry Insights</h1>
          <p className="text-theme-foreground-muted mt-1">
            Where labels scout talent and stay current on industry trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'feed' && (
            <>
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-theme-card hover:bg-theme-card-hover border border-theme-border text-sm text-theme-foreground-secondary hover:text-theme-foreground transition-all disabled:opacity-50"
              >
                <Rss className="w-4 h-4" />
                Seed Feeds
              </button>
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-theme-primary-15 hover:bg-theme-primary-25 border border-theme-border-hover text-sm text-theme-primary hover:text-theme-primary transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Feeds
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-theme-primary-15 hover:bg-theme-primary-25 border border-theme-border-hover text-sm text-theme-primary transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Article
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-theme-card border border-theme-border w-fit">
        <button
          onClick={() => setViewMode('feed')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'feed'
              ? 'bg-theme-primary-15 text-theme-primary'
              : 'text-theme-foreground-muted hover:text-theme-foreground'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Latest News
        </button>
        <button
          onClick={() => setViewMode('sources')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'sources'
              ? 'bg-theme-primary-15 text-theme-primary'
              : 'text-theme-foreground-muted hover:text-theme-foreground'
          }`}
        >
          <Globe className="w-4 h-4" />
          Source Directory
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
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
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-theme-primary-15 text-theme-primary border border-theme-border-hover'
                  : 'bg-theme-card text-theme-foreground-muted hover:bg-theme-card-hover hover:text-theme-foreground border border-theme-border'
              }`}
            >
              <span className={config.color}>{config.icon}</span>
              {config.label}
              <span className="text-xs text-theme-foreground-muted opacity-50">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {viewMode === 'feed' ? (
        <div className="space-y-4">
          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 bg-theme-card border border-theme-border">
              <Rss className="w-12 h-12 text-theme-primary-30 mx-auto mb-4" />
              <h3 className="text-lg font-normal text-theme-foreground mb-2">No Articles Yet</h3>
              <p className="text-theme-foreground-muted mb-4">
                Click "Seed Feeds" to set up sources, then "Refresh Feeds" to fetch articles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles
                .filter(a => selectedCategory === 'all' || a.category === selectedCategory)
                .map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onPin={() => pinMutation.mutate(article.id)}
                    onHide={() => hideMutation.mutate(article.id)}
                  />
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
                    <span className={config.color}>{config.icon}</span>
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

      {/* Add Article Modal */}
      {showAddModal && (
        <AddArticleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['insights-articles'] });
          }}
        />
      )}
    </div>
  );
};

const ArticleCard: React.FC<{
  article: Article;
  onPin: () => void;
  onHide: () => void;
}> = ({ article, onPin, onHide }) => {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`group relative overflow-hidden bg-theme-card border transition-all duration-300 ${
      article.isPinned ? 'border-theme-primary-50 bg-theme-primary-5' : 'border-theme-border hover:border-theme-border-hover'
    }`}>
      {/* Animated top border */}
      <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />

      {/* Thumbnail */}
      {article.imageUrl && (
        <div className="relative w-full h-40 bg-black/20">
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onPin}
              className="p-1.5 hover:bg-theme-primary-10 transition-colors"
              title={article.isPinned ? 'Unpin' : 'Pin'}
            >
              {article.isPinned ? (
                <PinOff className="w-4 h-4 text-theme-primary" />
              ) : (
                <Pin className="w-4 h-4 text-theme-foreground-muted hover:text-theme-primary" />
              )}
            </button>
            <button
              onClick={onHide}
              className="p-1.5 hover:bg-theme-card-hover transition-colors"
              title="Hide"
            >
              <EyeOff className="w-4 h-4 text-theme-foreground-muted hover:text-theme-foreground" />
            </button>
          </div>
        </div>
        {article.description && (
          <p className="text-sm text-theme-foreground-muted line-clamp-2 mb-3">{article.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-theme-primary bg-theme-primary-10 px-2 py-1 flex items-center gap-1">
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
};

const SourceCard: React.FC<{ source: Source }> = ({ source }) => (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block bg-theme-card hover:bg-theme-card-hover border border-theme-border hover:border-theme-border-hover p-4 transition-all duration-300"
    >
      <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-theme-foreground font-medium group-hover:text-theme-primary transition-colors">
          {source.name}
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-theme-foreground-muted group-hover:text-theme-primary transition-colors" />
      </div>
      <p className="text-sm text-theme-foreground-muted mb-3">{source.description}</p>
      <span className="text-xs text-theme-primary bg-theme-primary-10 px-2 py-1 inline-flex items-center gap-1">
        {source.category}
      </span>
    </a>
);

const AddArticleModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    source: '',
    category: 'NEWS' as Exclude<Category, 'all'>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryLabels: Record<Exclude<Category, 'all'>, string> = {
    AGGREGATOR: 'Aggregator',
    TASTEMAKERS: 'Tastemakers',
    DISCOVERY: 'Discovery',
    NEWS: 'Industry News',
    PUBLISHERS: 'Publishers',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/insights/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add article');
      }

      toast.success('Article added successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-theme-card border border-theme-border w-full max-w-md">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
        <div className="flex items-center justify-between p-4 border-b border-theme-border">
          <h2 className="text-lg font-light text-theme-foreground">Add Article</h2>
          <button onClick={onClose} className="p-2 hover:bg-theme-primary-10 transition-colors">
            <X className="w-5 h-5 text-theme-foreground-muted hover:text-theme-primary" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-1">URL *</label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus"
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-1">Source *</label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus"
              placeholder="e.g., Billboard, Pitchfork"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
            >
              {(Object.keys(categoryLabels) as Exclude<Category, 'all'>[]).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus resize-none"
              rows={3}
              placeholder="Brief description (optional)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsightsTab;
