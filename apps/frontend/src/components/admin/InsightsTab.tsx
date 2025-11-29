import React, { useState } from 'react';
import { ExternalLink, TrendingUp, Newspaper, Music, Radio, Award, BookOpen } from 'lucide-react';

type Category = 'all' | 'aggregator' | 'tastemakers' | 'discovery' | 'news' | 'publishers';

interface Source {
  name: string;
  url: string;
  description: string;
  category: Exclude<Category, 'all'>;
  logo?: string;
}

const sources: Source[] = [
  // Blog Aggregator
  {
    name: 'Hype Machine',
    url: 'https://hypem.com',
    description: 'Tracks trending songs across music blogs - see what the blogosphere is buzzing about',
    category: 'aggregator',
  },
  // Critical Tastemakers
  {
    name: 'Pitchfork',
    url: 'https://pitchfork.com',
    description: 'Critical validation; Indie, Experimental, Rap, Electronic',
    category: 'tastemakers',
  },
  {
    name: 'The FADER',
    url: 'https://thefader.com',
    description: 'Culture, Style, Music - especially Hip-Hop, R&B, Pop',
    category: 'tastemakers',
  },
  {
    name: 'NME',
    url: 'https://nme.com',
    description: 'UK/Global Indie, Alternative, and General New Music',
    category: 'tastemakers',
  },
  {
    name: 'Pigeons & Planes',
    url: 'https://pigeonsandplanes.com',
    description: 'Premier digital tastemaker; Hip-Hop, R&B, Crossover Indie (Complex)',
    category: 'tastemakers',
  },
  // Scouting/Discovery
  {
    name: 'Lyrical Lemonade',
    url: 'https://lyricallemonade.com',
    description: 'Visual content, music videos, producer discoveries',
    category: 'discovery',
  },
  {
    name: 'On The Radar',
    url: 'https://www.youtube.com/@OnTheRadarRadio',
    description: 'Underground hip-hop showcases and freestyles',
    category: 'discovery',
  },
  {
    name: 'XXL',
    url: 'https://xxlmag.com',
    description: 'Freshman lists, producer spotlights, hip-hop news',
    category: 'discovery',
  },
  {
    name: 'HotNewHipHop',
    url: 'https://hotnewhiphop.com',
    description: 'Daily new music coverage and releases',
    category: 'discovery',
  },
  {
    name: 'Genius',
    url: 'https://genius.com',
    description: 'Trending songs, lyrics, producer credits',
    category: 'discovery',
  },
  {
    name: 'No Jumper',
    url: 'https://www.youtube.com/@nojumper',
    description: 'Interviews with emerging artists and producers',
    category: 'discovery',
  },
  {
    name: 'WorldStar',
    url: 'https://worldstarhiphop.com',
    description: 'Viral content and music videos',
    category: 'discovery',
  },
  // Industry News & Charts
  {
    name: 'Billboard',
    url: 'https://billboard.com',
    description: 'Commercial metrics, charts, industry news and analysis',
    category: 'news',
  },
  {
    name: 'Rolling Stone',
    url: 'https://rollingstone.com/music',
    description: 'Cultural significance; mainstream to emerging talent coverage',
    category: 'news',
  },
  {
    name: 'Music Business Worldwide',
    url: 'https://musicbusinessworldwide.com',
    description: 'Label deals, publisher news, industry business',
    category: 'news',
  },
  {
    name: 'Variety Music',
    url: 'https://variety.com/c/music',
    description: 'Entertainment business and music industry news',
    category: 'news',
  },
  // Publisher/PRO
  {
    name: 'ASCAP',
    url: 'https://ascap.com/news',
    description: 'PRO news, songwriter resources, industry updates',
    category: 'publishers',
  },
  {
    name: 'BMI',
    url: 'https://bmi.com/news',
    description: 'PRO news, licensing updates, creator spotlight',
    category: 'publishers',
  },
  {
    name: 'The MLC',
    url: 'https://themlc.com/news',
    description: 'Mechanical licensing news and updates',
    category: 'publishers',
  },
];

const categoryConfig: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: 'All Sources', icon: <TrendingUp className="w-4 h-4" />, color: 'text-white' },
  aggregator: { label: 'Blog Aggregator', icon: <Radio className="w-4 h-4" />, color: 'text-purple-400' },
  tastemakers: { label: 'Critical Tastemakers', icon: <Award className="w-4 h-4" />, color: 'text-amber-400' },
  discovery: { label: 'Scouting & Discovery', icon: <Music className="w-4 h-4" />, color: 'text-green-400' },
  news: { label: 'Industry News', icon: <Newspaper className="w-4 h-4" />, color: 'text-blue-400' },
  publishers: { label: 'Publishers & PROs', icon: <BookOpen className="w-4 h-4" />, color: 'text-rose-400' },
};

const InsightsTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

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
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(categoryConfig) as Category[]).map((cat) => {
          const config = categoryConfig[cat];
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                }
              `}
            >
              <span className={config.color}>{config.icon}</span>
              {config.label}
              {cat !== 'all' && (
                <span className="text-xs text-gray-500">
                  ({sources.filter(s => s.category === cat).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sources Grid */}
      {selectedCategory === 'all' ? (
        // Show grouped by category when viewing all
        <div className="space-y-8">
          {(Object.keys(categoryConfig) as Category[])
            .filter(cat => cat !== 'all')
            .map((cat) => {
              const catSources = sources.filter(s => s.category === cat);
              if (catSources.length === 0) return null;
              const config = categoryConfig[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={config.color}>{config.icon}</span>
                    <h2 className="text-lg font-semibold text-white">{config.label}</h2>
                    <span className="text-sm text-gray-500">({catSources.length})</span>
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
      ) : (
        // Show flat grid when filtering by category
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => (
            <SourceCard key={source.name} source={source} />
          ))}
        </div>
      )}

      {/* Pro Tip */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Pro Tip</h3>
            <p className="text-sm text-gray-400">
              Labels and A&Rs regularly check these sources to discover new talent.
              Getting featured on platforms like Pitchfork, Pigeons & Planes, or Lyrical Lemonade
              can significantly boost your visibility to industry scouts.
            </p>
          </div>
        </div>
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">
              {source.name}
            </h3>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </div>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {source.description}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-xs ${config.color} bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1`}>
          {config.icon}
          {config.label}
        </span>
      </div>
    </a>
  );
};

export default InsightsTab;
