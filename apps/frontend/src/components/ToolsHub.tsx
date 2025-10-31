import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url: string;
  category: string;
}

const TOOLS: Tool[] = [
  {
    id: 'pub-deal-simulator',
    name: 'Pub Deal Simulator',
    description: 'Simulate and analyze publishing deal scenarios. Calculate royalties and earnings projections.',
    icon: '💰',
    color: 'from-blue-500 to-blue-600',
    url: '/tools/pub-deal-simulator',
    category: 'Financial'
  },
  {
    id: 'consultation-form',
    name: 'Consultation Form',
    description: 'Schedule and manage consultation appointments. Collect producer information and preferences.',
    icon: '📋',
    color: 'from-purple-500 to-purple-600',
    url: '/tools/consultation',
    category: 'Management'
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Explore real-world producer success stories. Learn from case studies and best practices.',
    icon: '📚',
    color: 'from-green-500 to-green-600',
    url: '/tools/case-study',
    category: 'Learning'
  },
  {
    id: 'royalty-tracker',
    name: 'Royalty Portal',
    description: 'Track and manage royalty payments. Real-time analytics and earning reports.',
    icon: '📊',
    color: 'from-orange-500 to-orange-600',
    url: '/tools/royalty-portal',
    category: 'Financial'
  },
  {
    id: 'opportunities',
    name: 'Opportunities',
    description: 'Browse and apply for publishing opportunities. Discover collaboration and distribution deals.',
    icon: '🎯',
    color: 'from-pink-500 to-pink-600',
    url: '/tools/opportunities',
    category: 'Opportunities'
  },
  {
    id: 'publishing-tracker',
    name: 'Publishing Tracker',
    description: 'Monitor your music distribution across platforms. Track placements and performance.',
    icon: '🎵',
    color: 'from-indigo-500 to-indigo-600',
    url: '/tools/publishing-tracker',
    category: 'Analytics'
  },
  {
    id: 'advance-estimator',
    name: 'Advance Estimator',
    description: 'Calculate potential catalog funding and advances. Model different deal scenarios based on your earnings.',
    icon: '💰',
    color: 'from-emerald-500 to-emerald-600',
    url: '/tools/advance-estimator',
    category: 'Financial'
  }
];

export default function ToolsHub() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(TOOLS.map(tool => tool.category))];
  const filteredTools = selectedCategory === 'All' 
    ? TOOLS 
    : TOOLS.filter(tool => tool.category === selectedCategory);

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
        <h1 className="text-4xl font-bold text-white mb-2">🛠️ Tools Hub</h1>
        <p className="text-gray-400 text-lg">Access all your productivity tools and resources in one place</p>
      </div>

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
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Carousel */}
      <div className="relative">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
          {/* Tool Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 min-h-96">
            {/* Left Side - Visual */}
            <div className={`bg-gradient-to-br ${currentTool.color} rounded-xl p-8 flex flex-col justify-center items-center text-center shadow-lg`}>
              <div className="text-8xl mb-4 animate-pulse">{currentTool.icon}</div>
              <h2 className="text-white text-2xl font-bold">{currentTool.name}</h2>
              <p className="text-white/80 text-sm mt-2 font-medium">{currentTool.category}</p>
            </div>

            {/* Right Side - Info & Action */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">{currentTool.name}</h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  {currentTool.description}
                </p>

                {/* Features Based on Tool */}
                <div className="space-y-3 mb-8">
                  {currentTool.id === 'pub-deal-simulator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Calculate royalty splits and earnings</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Scenario modeling and comparisons</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Export detailed reports</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'consultation-form' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Schedule appointments</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Collect producer details</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Automated confirmations</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'case-study' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Real producer success stories</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Actionable insights and strategies</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Downloadable resources</span>
                      </div>
                    </>
                  )}
                  {currentTool.id === 'advance-estimator' && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Calculate potential funding amounts</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Model different contract scenarios</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Save and compare scenarios</span>
                      </div>
                    </>
                  )}
                  {!['pub-deal-simulator', 'consultation-form', 'case-study', 'advance-estimator'].includes(currentTool.id) && (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Real-time data and analytics</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Comprehensive reporting</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-400 text-xl">✓</span>
                        <span className="text-gray-300">Easy integration</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => openTool(currentTool)}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                🚀 Enter {currentTool.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110"
        >
          ‹
        </button>
        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-all hover:scale-110"
        >
          ›
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
                : 'bg-slate-600 hover:bg-slate-500 w-3'
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
                  ? 'border-blue-500 bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
              onClick={() => openTool(tool)}
            >
              <div className="text-5xl mb-3">{tool.icon}</div>
              <h4 className="text-white font-bold text-lg mb-2">{tool.name}</h4>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{tool.description}</p>
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
        <div className="bg-slate-800 rounded-lg p-6 text-center border border-slate-700">
          <div className="text-4xl font-bold text-blue-400 mb-2">{TOOLS.length}</div>
          <p className="text-gray-400">Total Tools Available</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 text-center border border-slate-700">
          <div className="text-4xl font-bold text-green-400 mb-2">{categories.length - 1}</div>
          <p className="text-gray-400">Categories</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 text-center border border-slate-700">
          <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
          <p className="text-gray-400">Productivity Boost</p>
        </div>
      </div>
    </div>
  );
}