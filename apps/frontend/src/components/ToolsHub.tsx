import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LucideIcon, CircleDollarSign, ClipboardList, BookOpen, Target, Music, Sparkles, Wrench, Info, Lock, Rocket, Check, ChevronLeft, ChevronRight, Search, Video, FileCheck, Coins } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { gamificationApi, toolPermissionsApi } from '../lib/api';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  url: string;
  category: string;
  roles: string[]; // Which roles can access this tool
  requiresPurchase?: boolean; // Whether tool requires Tour Miles purchase
  purchaseToolId?: string; // Tool ID for gamification check
  tourMilesCost?: number; // Cost in Tour Miles
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
    id: 'producer-clearances',
    name: 'Producer Clearances',
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
    roles: ['ADMIN', 'WRITER', 'CUSTOMER'], // Available to Writers, Admins, and Customers
    requiresPurchase: true, // Only applies to CUSTOMER role
    purchaseToolId: 'type-beat-video-maker',
    tourMilesCost: 750
  },
  {
    id: 'session-payout',
    name: 'Session Payout & Delivery',
    description: 'Submit session metadata, asset delivery links, and calculate engineer payments. Complete payout management for studio sessions.',
    icon: FileCheck,
    color: 'from-teal-500 to-teal-600',
    url: '/tools/session-payout',
    category: 'Financial',
    roles: ['ADMIN', 'WRITER'] // Available to admins and writers
  }
];

export default function ToolsHub() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Fetch user's tool permissions from backend
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-tool-permissions'],
    queryFn: async () => {
      const response = await toolPermissionsApi.getUserPermissions();
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch user's tool access for premium tools (only for CUSTOMER role)
  const { data: toolAccessData } = useQuery({
    queryKey: ['user-tool-access'],
    queryFn: async () => {
      const response = await gamificationApi.getUserToolAccess();
      return response.data;
    },
    // Only fetch for roles that need to purchase access (not ADMIN or WRITER)
    enabled: !!user && user.role !== 'ADMIN' && user.role !== 'WRITER',
  });

  // Get allowed tool IDs from backend permissions
  const allowedToolIds = permissionsData?.toolIds || [];
  const userRole = user?.role || 'WRITER';

  // Filter tools based on backend permissions
  const roleBasedTools = TOOLS.filter(tool => allowedToolIds.includes(tool.id));

  // Show loading state while fetching permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin" />
        <span className="ml-3 text-theme-foreground-muted">Loading tools...</span>
      </div>
    );
  }

  // Check if user has access to a premium tool
  const hasToolAccess = (tool: Tool): boolean => {
    // Admins always have access
    if (userRole === 'ADMIN') return true;
    // Writers have free access to all tools
    if (userRole === 'WRITER') return true;
    // Non-premium tools are always accessible
    if (!tool.requiresPurchase) return true;
    // For CUSTOMER and other roles, check if user has purchased access
    if (!toolAccessData?.toolAccess) return false;
    return toolAccessData.toolAccess.some(
      (access: { details?: { toolId?: string } }) => access.details?.toolId === tool.purchaseToolId
    );
  };

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

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const openTool = (tool: Tool) => {
    navigate(tool.url);
  };

  const currentTool = filteredTools[currentIndex];

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Mobile Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="sm:hidden flex items-center gap-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors -mb-4"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-light text-theme-foreground mb-2 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-theme-primary-10 flex items-center justify-center">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-theme-primary" />
          </div>
          Tools Hub
        </h1>
        <p className="text-theme-foreground-muted text-sm sm:text-lg">Access all your productivity tools and resources in one place</p>
        {userRole !== 'ADMIN' && (
          <div className="mt-4 bg-theme-primary-10 border border-theme-border-hover p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-theme-primary flex-shrink-0" />
            <p className="text-sm text-theme-primary">
              You're viewing tools available to <span className="font-semibold">{userRole}</span> role.
              Contact your administrator for access to additional tools.
            </p>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 ? (
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-12 text-center">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <div className="w-16 h-16 mx-auto mb-4 bg-theme-primary-10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-theme-foreground-muted" />
          </div>
          <h3 className="text-2xl font-light text-theme-foreground mb-2">No Tools Available</h3>
          <p className="text-theme-foreground-muted mb-6">
            {selectedCategory === 'All'
              ? "You don't have access to any tools yet. Please contact your administrator."
              : `No tools available in the "${selectedCategory}" category for your role.`
            }
          </p>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium transition-colors"
            >
              View All Categories
            </button>
          )}
        </div>
      ) : (
        <>

      {/* Category Filter */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentIndex(0);
            }}
            className={`px-4 py-2 text-sm font-medium uppercase tracking-wider transition-all ${
              selectedCategory === category
                ? 'bg-theme-primary text-theme-primary-foreground'
                : 'text-theme-foreground-muted hover:text-theme-foreground hover:bg-theme-card-hover'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Carousel */}
      <div className="relative">
        <div
          className="bg-theme-card rounded-2xl overflow-hidden shadow-2xl border border-theme-border"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Tool Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 min-h-96">
            {/* Left Side - Visual */}
            <div className={`bg-gradient-to-br ${currentTool.color} rounded-xl p-8 flex flex-col justify-center items-center text-center shadow-lg relative`}>
              {/* Premium Badge */}
              {currentTool.requiresPurchase && !hasToolAccess(currentTool) && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold">{currentTool.tourMilesCost} TP</span>
                </div>
              )}
              {currentTool.requiresPurchase && hasToolAccess(currentTool) && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 backdrop-blur-sm rounded-full">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">Unlocked</span>
                </div>
              )}
              <div className={`w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 ${hasToolAccess(currentTool) ? 'animate-pulse' : ''}`}>
                {!hasToolAccess(currentTool) && currentTool.requiresPurchase ? (
                  <Lock className="w-12 h-12 text-white/60" />
                ) : (
                  <currentTool.icon className="w-12 h-12 text-white" />
                )}
              </div>
              <h2 className="text-white text-2xl font-bold drop-shadow-md">{currentTool.name}</h2>
              <p className="text-white/80 text-sm mt-2 font-medium">{currentTool.category}</p>
            </div>

            {/* Right Side - Info & Action */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-theme-foreground mb-4">{currentTool.name}</h3>
                <p className="text-theme-foreground-secondary text-lg leading-relaxed mb-6">
                  {currentTool.description}
                </p>

                {/* Features Based on Tool */}
                <div className="space-y-3 mb-8">
                  {currentTool.id === 'pub-deal-simulator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Calculate royalty splits and earnings</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Scenario modeling and comparisons</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Export detailed reports</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'consultation-form' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Schedule appointments</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Collect producer details</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Automated confirmations</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'case-study' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Real producer success stories</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Actionable insights and strategies</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Downloadable resources</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'advance-estimator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Calculate potential funding amounts</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Model different contract scenarios</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Save and compare scenarios</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'work-registration' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Spotify search integration</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">AudioDB metadata enrichment</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Album art and visual previews</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Track submission status</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'metadata-index' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">ISRC/UPC code search & verification</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Spotify & MusicBrainz cross-reference</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Save tracks to custom research lists</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Export data to CSV & JSON</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'type-beat-video-maker' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Combine beats with images into videos</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Batch process multiple beats at once</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Auto-upload directly to YouTube</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Support for 16:9 and 9:16 formats</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'session-payout' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Submit session metadata and asset links</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Calculate engineer payments automatically</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Track session files and deliverables</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-theme-foreground-secondary">Auto-generated work order numbers</span>
                      </div>
                    </>
                  )}
                  {!['pub-deal-simulator', 'consultation-form', 'case-study', 'advance-estimator', 'work-registration', 'metadata-index', 'type-beat-video-maker', 'session-payout'].includes(currentTool.id) && (
                    <>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-theme-foreground-secondary">Real-time data and analytics</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-theme-foreground-secondary">Comprehensive reporting</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-theme-foreground-secondary">Easy integration</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => openTool(currentTool)}
                className={`w-full px-8 py-4 font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2 ${
                  hasToolAccess(currentTool)
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                }`}>
                {hasToolAccess(currentTool) ? (
                  <>
                    <Rocket className="w-5 h-5" />
                    Enter {currentTool.name.split(' ')[0]}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Unlock with Tour Miles
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows - hidden on mobile, visible on md+ */}
        <button
          onClick={goToPrevious}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110 items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goToNext}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110 items-center justify-center"
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
                : 'bg-theme-input hover:bg-theme-card-hover w-3'
            }`}
          />
        ))}
      </div>

      {/* All Tools Grid (Optional - below carousel) */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-theme-foreground mb-6">All Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool, index) => {
            const isLocked = !hasToolAccess(tool);
            return (
              <div
                key={tool.id}
                className={`group cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-105 relative ${
                  index === currentIndex
                    ? 'border-blue-500 bg-theme-card shadow-xl'
                    : isLocked && tool.requiresPurchase
                      ? 'border-yellow-500/30 bg-theme-card hover:border-yellow-500/50'
                      : 'border-theme-border bg-theme-card hover:border-theme-border-hover'
                }`}
                onClick={() => openTool(tool)}
              >
                {/* Premium Badge for Grid */}
                {tool.requiresPurchase && isLocked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-semibold">{tool.tourMilesCost}</span>
                  </div>
                )}
                {tool.requiresPurchase && !isLocked && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                )}
                <div className={`w-14 h-14 rounded-xl bg-theme-input border border-theme-border flex items-center justify-center mb-3 relative ${
                  isLocked && tool.requiresPurchase ? 'opacity-60' : ''
                }`}>
                  {isLocked && tool.requiresPurchase ? (
                    <Lock className="w-7 h-7 text-theme-foreground-muted" />
                  ) : (
                    <tool.icon className="w-7 h-7 text-theme-foreground" />
                  )}
                </div>
                <h4 className="text-theme-foreground font-bold text-base sm:text-lg mb-2 break-words">{tool.name}</h4>
                <p className="text-theme-foreground-muted text-sm mb-3 line-clamp-2">{tool.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isLocked && tool.requiresPurchase ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {isLocked && tool.requiresPurchase ? 'Premium Tool' : tool.category}
                  </span>
                  <span className="text-lg group-hover:translate-x-1 transition-transform">
                    {isLocked && tool.requiresPurchase ? <Lock className="w-4 h-4 text-yellow-400" /> : '→'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 text-center group hover:border-theme-border-hover transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <div className="text-4xl font-light text-theme-primary mb-2">{roleBasedTools.length}</div>
          <p className="text-theme-foreground-muted">Tools Available to You</p>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 text-center group hover:border-theme-border-hover transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <div className="text-4xl font-light text-theme-foreground mb-2">{categories.length - 1}</div>
          <p className="text-theme-foreground-muted">Categories</p>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 text-center group hover:border-theme-border-hover transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <div className="text-4xl font-light text-theme-foreground mb-2">100%</div>
          <p className="text-theme-foreground-muted">Productivity Boost</p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}