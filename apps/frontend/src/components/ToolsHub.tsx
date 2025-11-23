import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon, CircleDollarSign, ClipboardList, BookOpen, BarChart3, Target, Music, Sparkles, Wrench, Info, Lock, Rocket, Check, ChevronLeft, ChevronRight, Search, Video } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  url: string;
  category: string;
  roles: string[]; // Which roles can access this tool
}

const TOOLS: Tool[] = [
  {
    id: 'pub-deal-simulator',
    name: 'Pub Deal Simulator',
    description: 'Simulate and analyze publishing deal scenarios. Calculate royalties and earnings projections.',
    icon: CircleDollarSign,
    color: 'from-blue-500 to-blue-600',
    url: '/tools/pub-deal-simulator',
    category: 'Financial',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'consultation-form',
    name: 'Consultation Form',
    description: 'Schedule and manage consultation appointments. Collect producer information and preferences.',
    icon: ClipboardList,
    color: 'from-purple-500 to-purple-600',
    url: '/tools/consultation',
    category: 'Management',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Explore real-world producer success stories. Learn from case studies and best practices.',
    icon: BookOpen,
    color: 'from-green-500 to-green-600',
    url: '/tools/case-study',
    category: 'Learning',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'royalty-tracker',
    name: 'Royalty Portal',
    description: 'Track and manage royalty payments. Real-time analytics and earning reports.',
    icon: BarChart3,
    color: 'from-orange-500 to-orange-600',
    url: '/tools/royalty-portal',
    category: 'Financial',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'opportunities',
    name: 'Opportunities',
    description: 'Browse and apply for publishing opportunities. Discover collaboration and distribution deals.',
    icon: Target,
    color: 'from-pink-500 to-pink-600',
    url: '/tools/opportunities',
    category: 'Opportunities',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'advance-estimator',
    name: 'Advance Estimator',
    description: 'Calculate potential catalog funding and advances. Model different deal scenarios based on your earnings.',
    icon: CircleDollarSign,
    color: 'from-emerald-500 to-emerald-600',
    url: '/tools/advance-estimator',
    category: 'Financial',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'placement-tracker',
    name: 'Placement Tracker',
    description: 'Track music placements, manage contracts, and generate invoices with AI-powered tools. Complete deal tracking with billing automation.',
    icon: Music,
    color: 'from-cyan-500 to-cyan-600',
    url: '/admin?tab=active-placements',
    category: 'Management',
    roles: ['ADMIN'] // Admin only
  },
  {
    id: 'work-registration',
    name: 'Work Registration Tool',
    description: 'Submit your music for placement tracking. Search Spotify, enrich with AudioDB metadata, and submit for admin review with beautiful visual previews.',
    icon: Sparkles,
    color: 'from-blue-600 to-purple-600',
    url: '/work-registration',
    category: 'Management',
    roles: ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL'] // Available to all roles
  },
  {
    id: 'metadata-index',
    name: 'Metadata Index',
    description: 'Search and verify music metadata using ISRC/UPC codes, keywords, or Spotify URLs. Cross-reference with MusicBrainz and manage your research lists.',
    icon: Search,
    color: 'from-slate-500 to-slate-600',
    url: '/tools/metadata-index',
    category: 'Research',
    roles: ['ADMIN'] // Admin only by default
  },
  {
    id: 'type-beat-video-maker',
    name: 'Type Beat Video Maker',
    description: 'Create professional type beat videos by combining audio tracks with images. Batch process multiple beats and auto-upload directly to YouTube.',
    icon: Video,
    color: 'from-red-500 to-red-600',
    url: '/tools/type-beat-video-maker',
    category: 'Content',
    roles: ['ADMIN', 'WRITER'] // Available to Writers and Admins
  }
];

export default function ToolsHub() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter tools based on user role
  const userRole = user?.role || 'WRITER';
  const roleBasedTools = TOOLS.filter(tool => tool.roles.includes(userRole));

  const categories = ['All', ...new Set(roleBasedTools.map(tool => tool.category))];
  const filteredTools = selectedCategory === 'All'
    ? roleBasedTools
    : roleBasedTools.filter(tool => tool.category === selectedCategory);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredTools.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const openTool = (tool: Tool) => {
    navigate(tool.url);
  };

  const currentTool = filteredTools[currentIndex];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          Tools Hub
        </h1>
        <p className="text-text-muted text-lg">Access all your productivity tools and resources in one place</p>
        {userRole !== 'ADMIN' && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              You're viewing tools available to <span className="font-semibold">{userRole}</span> role.
              Contact your administrator for access to additional tools.
            </p>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Tools Available</h3>
          <p className="text-text-muted mb-6">
            {selectedCategory === 'All'
              ? "You don't have access to any tools yet. Please contact your administrator."
              : `No tools available in the "${selectedCategory}" category for your role.`
            }
          </p>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View All Categories
            </button>
          )}
        </div>
      ) : (
        <>

      {/* Category Filter */}
      <div className="flex gap-3 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentIndex(0);
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Carousel */}
      <div className="relative">
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08]">
          {/* Tool Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 min-h-96">
            {/* Left Side - Visual */}
            <div className={`bg-gradient-to-br ${currentTool.color} rounded-xl p-8 flex flex-col justify-center items-center text-center shadow-lg`}>
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse">
                <currentTool.icon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-white text-2xl font-bold">{currentTool.name}</h2>
              <p className="text-white/80 text-sm mt-2 font-medium">{currentTool.category}</p>
            </div>

            {/* Right Side - Info & Action */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">{currentTool.name}</h3>
                <p className="text-text-secondary text-lg leading-relaxed mb-6">
                  {currentTool.description}
                </p>

                {/* Features Based on Tool */}
                <div className="space-y-3 mb-8">
                  {currentTool.id === 'pub-deal-simulator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Calculate royalty splits and earnings</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Scenario modeling and comparisons</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Export detailed reports</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'consultation-form' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Schedule appointments</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Collect producer details</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Automated confirmations</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'case-study' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Real producer success stories</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Actionable insights and strategies</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Downloadable resources</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'advance-estimator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Calculate potential funding amounts</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Model different contract scenarios</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Save and compare scenarios</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'work-registration' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Spotify search integration</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">AudioDB metadata enrichment</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Album art and visual previews</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Track submission status</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'metadata-index' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">ISRC/UPC code search & verification</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Spotify & MusicBrainz cross-reference</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Save tracks to custom research lists</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Export data to CSV & JSON</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'type-beat-video-maker' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Combine beats with images into videos</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Batch process multiple beats at once</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Auto-upload directly to YouTube</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-text-secondary">Support for 16:9 and 9:16 formats</span>
                      </div>
                    </>
                  )}
                  {!['pub-deal-simulator', 'consultation-form', 'case-study', 'advance-estimator', 'work-registration', 'metadata-index', 'type-beat-video-maker'].includes(currentTool.id) && (
                    <>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-text-secondary">Real-time data and analytics</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-text-secondary">Comprehensive reporting</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-text-secondary">Easy integration</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => openTool(currentTool)}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2">
                <Rocket className="w-5 h-5" />
                Enter {currentTool.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Carousel Dots */}
      <div className="flex justify-center gap-3">
        {filteredTools.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 w-8'
                : 'bg-white/10 hover:bg-white/20 w-3'
            }`}
          />
        ))}
      </div>

      {/* All Tools Grid (Optional - below carousel) */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-white mb-6">All Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, index) => (
            <div
              key={tool.id}
              className={`group cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                index === currentIndex
                  ? 'border-blue-500 bg-gradient-to-br from-white/[0.08] to-white/[0.04] shadow-xl'
                  : 'border-white/[0.08] bg-white/[0.04] hover:border-white/20'
              }`}
              onClick={() => openTool(tool)}
            >
              <div className="w-14 h-14 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center mb-3">
                <tool.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">{tool.name}</h4>
              <p className="text-text-muted text-sm mb-3 line-clamp-2">{tool.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">{tool.category}</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6 text-center border border-white/[0.08]">
          <div className="text-4xl font-bold text-blue-400 mb-2">{roleBasedTools.length}</div>
          <p className="text-text-muted">Tools Available to You</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6 text-center border border-white/[0.08]">
          <div className="text-4xl font-bold text-green-400 mb-2">{categories.length - 1}</div>
          <p className="text-text-muted">Categories</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6 text-center border border-white/[0.08]">
          <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
          <p className="text-text-muted">Productivity Boost</p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}