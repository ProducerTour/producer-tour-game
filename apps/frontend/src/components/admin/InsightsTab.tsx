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

const categoryConfig: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: 'All', icon: <TrendingUp className="w-4 h-4" />, color: 'text-white' },
  AGGREGATOR: { label: 'Aggregator', icon: <Radio className="w-4 h-4" />, color: 'text-purple-400' },
  TASTEMAKERS: { label: 'Tastemakers', icon: <Award className="w-4 h-4" />, color: 'text-amber-400' },
  DISCOVERY: { label: 'Discovery', icon: <Music className="w-4 h-4" />, color: 'text-green-400' },
  NEWS: { label: 'Industry News', icon: <Newspaper className="w-4 h-4" />, color: 'text-blue-400' },
  PUBLISHERS: { label: 'Publishers', icon: <BookOpen className="w-4 h-4" />, color: 'text-rose-400' },
};

const InsightsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
          <h1 className="text-2xl font-bold text-white">Industry Insights</h1>
          <p className="text-gray-400 mt-1">
            Where labels scout talent and stay current on industry trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'feed' && (
            <>
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50"
              >
                <Rss className="w-4 h-4" />
                Seed Feeds
              </button>
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Feeds
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm text-green-400 hover:text-green-300 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Article
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('feed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'feed'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Latest News
        </button>
        <button
          onClick={() => setViewMode('sources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'sources'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <span className={config.color}>{config.icon}</span>
              {config.label}
              <span className="text-xs text-gray-500">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {viewMode === 'feed' ? (
        <div className="space-y-4">
          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Rss className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Articles Yet</h3>
              <p className="text-gray-400 mb-4">
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
                    <h2 className="text-lg font-semibold text-white">{config.label}</h2>
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
  const config = categoryConfig[article.category];
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`group bg-white/5 hover:bg-white/10 border rounded-xl p-4 transition-all ${
      article.isPinned ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 hover:border-white/20'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {article.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-xs text-gray-500">{article.source}</span>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold hover:text-blue-400 transition-colors line-clamp-2"
          >
            {article.title}
          </a>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPin}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={article.isPinned ? 'Unpin' : 'Pin'}
          >
            {article.isPinned ? (
              <PinOff className="w-4 h-4 text-amber-400" />
            ) : (
              <Pin className="w-4 h-4 text-gray-400 hover:text-amber-400" />
            )}
          </button>
          <button
            onClick={onHide}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Hide"
          >
            <EyeOff className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
      {article.description && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{article.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${config.color} bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1`}>
          {config.icon}
          {config.label}
        </span>
        {publishedDate && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {publishedDate}
          </span>
        )}
      </div>
    </div>
  );
};

const SourceCard: React.FC<{ source: Source }> = ({ source }) => {
  const config = categoryConfig[source.category];

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
          {source.name}
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
      </div>
      <p className="text-sm text-gray-400 mb-3">{source.description}</p>
      <span className={`text-xs ${config.color} bg-white/5 px-2 py-1 rounded-lg inline-flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </span>
    </a>
  );
};

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
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Add Article</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Source *</label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="e.g., Billboard, Pitchfork"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {(Object.keys(categoryConfig) as Category[])
                .filter(c => c !== 'all')
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryConfig[cat].label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Brief description (optional)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
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
