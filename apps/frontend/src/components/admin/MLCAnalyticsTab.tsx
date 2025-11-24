/**
 * MLC Analytics Tab
 * Advanced analytics dashboard for MLC statement data with Recharts visualizations
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
} from '@tremor/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Treemap,
  ComposedChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { dashboardApi } from '../../lib/api';
import { TrendingUp, Music, DollarSign, BarChart3, Globe, Disc, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Color palettes
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Mock data for development/testing
const MOCK_MLC_DATA = {
  kpis: {
    totalRevenue: 156420.75,
    totalNetRevenue: 132957.64,
    uniqueSongs: 847,
    uniquePlatforms: 12,
    avgRevenuePerItem: 18.47,
    marginPercentage: 15.0,
    totalStatements: 24,
  },
  platforms: [
    { name: 'Spotify', revenue: 68500.25, netRevenue: 58225.21, commission: 10275.04, items: 2450, margin: 15.0 },
    { name: 'Apple Music', revenue: 42150.80, netRevenue: 35828.18, commission: 6322.62, items: 1680, margin: 15.0 },
    { name: 'Amazon Music', revenue: 18920.40, netRevenue: 16082.34, commission: 2838.06, items: 890, margin: 15.0 },
    { name: 'YouTube Music', revenue: 12450.30, netRevenue: 10582.76, commission: 1867.55, items: 720, margin: 15.0 },
    { name: 'Tidal', revenue: 6800.50, netRevenue: 5780.43, commission: 1020.08, items: 320, margin: 15.0 },
    { name: 'Deezer', revenue: 4200.25, netRevenue: 3570.21, commission: 630.04, items: 210, margin: 15.0 },
    { name: 'Pandora', revenue: 2100.15, netRevenue: 1785.13, commission: 315.02, items: 145, margin: 15.0 },
    { name: 'SoundCloud', revenue: 1298.10, netRevenue: 1103.39, commission: 194.72, items: 95, margin: 15.0 },
  ],
  serviceTypes: [
    { name: 'Premium Streaming', revenue: 98500.40, items: 4200 },
    { name: 'Ad-Supported', revenue: 32150.25, items: 1850 },
    { name: 'Downloads', revenue: 15420.80, items: 680 },
    { name: 'Ringtones', revenue: 8200.15, items: 420 },
    { name: 'Other', revenue: 2149.15, items: 160 },
  ],
  timeline: [
    { month: '2024-01', revenue: 11200, netRevenue: 9520, count: 580 },
    { month: '2024-02', revenue: 12450, netRevenue: 10583, count: 620 },
    { month: '2024-03', revenue: 13800, netRevenue: 11730, count: 710 },
    { month: '2024-04', revenue: 14200, netRevenue: 12070, count: 680 },
    { month: '2024-05', revenue: 15800, netRevenue: 13430, count: 750 },
    { month: '2024-06', revenue: 16500, netRevenue: 14025, count: 820 },
    { month: '2024-07', revenue: 14800, netRevenue: 12580, count: 690 },
    { month: '2024-08', revenue: 17200, netRevenue: 14620, count: 880 },
    { month: '2024-09', revenue: 18500, netRevenue: 15725, count: 920 },
    { month: '2024-10', revenue: 12000, netRevenue: 10200, count: 600 },
    { month: '2024-11', revenue: 9970, netRevenue: 8475, count: 510 },
  ],
  topSongs: [
    { title: 'Summer Vibes (feat. Artist)', revenue: 8420.50, performances: 245000, platformCount: 8 },
    { title: 'Midnight Dreams', revenue: 7150.25, performances: 198000, platformCount: 7 },
    { title: 'Electric Soul', revenue: 6280.80, performances: 175000, platformCount: 8 },
    { title: 'City Lights', revenue: 5890.40, performances: 162000, platformCount: 6 },
    { title: 'Ocean Waves', revenue: 4950.15, performances: 138000, platformCount: 7 },
    { title: 'Mountain High', revenue: 4120.90, performances: 115000, platformCount: 5 },
    { title: 'Desert Storm', revenue: 3680.25, performances: 102000, platformCount: 6 },
    { title: 'Neon Nights', revenue: 3250.70, performances: 89000, platformCount: 5 },
    { title: 'Golden Hour', revenue: 2890.35, performances: 78000, platformCount: 4 },
    { title: 'Silver Moon', revenue: 2450.80, performances: 67000, platformCount: 4 },
  ],
  territories: [
    { territory: 'United States', revenue: 82500.40 },
    { territory: 'United Kingdom', revenue: 18200.25 },
    { territory: 'Germany', revenue: 14500.80 },
    { territory: 'Canada', revenue: 12800.50 },
    { territory: 'France', revenue: 9420.30 },
    { territory: 'Australia', revenue: 7850.20 },
    { territory: 'Japan', revenue: 5680.15 },
    { territory: 'Brazil', revenue: 3200.80 },
    { territory: 'Mexico', revenue: 2268.35 },
  ],
  useTypes: [
    { type: 'Interactive Streaming', revenue: 98500.40 },
    { type: 'Non-Interactive Streaming', revenue: 32150.25 },
    { type: 'Limited Downloads', revenue: 15420.80 },
    { type: 'Ringtones/Ringbacks', revenue: 8200.15 },
    { type: 'Other Digital', revenue: 2149.15 },
  ],
};

// Enhanced custom tooltip component with glassmorphism
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl shadow-black/50">
        <p className="text-white font-semibold text-sm mb-3 pb-2 border-b border-white/10">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}50` }}
                />
                <span className="text-gray-400 text-sm">{entry.name}</span>
              </div>
              <span className="text-white font-medium text-sm">
                ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom pie chart legend
const CustomPieLegend = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-gray-300 text-sm">{entry.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-sm">
              ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-gray-500 text-xs w-12 text-right">
              {((entry.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Enhanced treemap content with gradient and glow effects
const CustomTreemapContent = ({ depth, x, y, width, height, index, name, revenue }: any) => {
  if (depth === 1 && width > 50 && height > 30) {
    const baseColor = COLORS[index % COLORS.length];
    return (
      <g>
        <defs>
          <linearGradient id={`treemapGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={baseColor} stopOpacity={1}/>
            <stop offset="100%" stopColor={baseColor} stopOpacity={0.7}/>
          </linearGradient>
          <filter id={`treemapShadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={baseColor} floodOpacity="0.3"/>
          </filter>
        </defs>
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          rx={6}
          ry={6}
          style={{
            fill: `url(#treemapGrad-${index})`,
            filter: `url(#treemapShadow-${index})`,
          }}
        />
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          rx={6}
          ry={6}
          style={{
            fill: 'none',
            stroke: 'rgba(255,255,255,0.2)',
            strokeWidth: 1,
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 8}
          textAnchor="middle"
          fill="#fff"
          fontSize={width > 100 ? 13 : 11}
          fontWeight="600"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {name?.length > (width > 100 ? 18 : 12) ? name.slice(0, width > 100 ? 18 : 12) + '...' : name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize={11}
          fontWeight="500"
        >
          ${(revenue || 0).toLocaleString()}
        </text>
      </g>
    );
  }
  return null;
};

// Theater Mode Overlay Component
const TheaterMode = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Content container */}
      <div
        className="relative z-10 w-[95vw] max-w-7xl h-[85vh] bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-white text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chart content - takes remaining space */}
        <div className="p-6 h-[calc(100%-72px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Chart expand button component
const ExpandButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
    title="Open in theater mode"
  >
    <Maximize2 className="w-4 h-4" />
  </button>
);

export default function MLCAnalyticsTab() {
  const [useMockData, setUseMockData] = useState(false);
  const [theaterChart, setTheaterChart] = useState<string | null>(null);
  const [timelineMonthOffset, setTimelineMonthOffset] = useState(0); // 0 = most recent, negative = older months

  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['mlc-analytics'],
    queryFn: async () => {
      const response = await dashboardApi.getMlcAnalytics();
      return response.data;
    },
  });

  // Use mock data when toggled in dev mode
  const data = useMockData ? MOCK_MLC_DATA : apiData;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if ((error || !data) && !useMockData) {
    return (
      <div className="space-y-4">
        {/* Dev Mode Toggle - show even on error in dev */}
        {isDev && (
          <Flex justifyContent="end">
            <button
              onClick={() => setUseMockData(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
            >
              🧪 Enable Mock Data
            </button>
          </Flex>
        )}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <Text className="text-red-400">Failed to load MLC Analytics. Make sure you have MLC statements uploaded.</Text>
        </div>
      </div>
    );
  }

  const { kpis, platforms, serviceTypes, timeline, topSongs, territories, useTypes } = data;

  // Prepare data for charts
  const platformBarData = platforms?.slice(0, 10).map((p: any) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
    fullName: p.name,
    revenue: Number(p.revenue) || 0,
    netRevenue: Number(p.netRevenue) || 0,
    margin: Number(p.margin) || 0,
  })) || [];

  // Group service types into meaningful categories
  const categorizeServiceType = (name: string): string => {
    const lower = name.toLowerCase();

    // Student plans
    if (lower.includes('student')) return 'Student Plans';

    // Family plans
    if (lower.includes('family') || lower.includes('duo')) return 'Family Plans';

    // Ad-supported / Free tier
    if (lower.includes('free') || lower.includes('ad') || lower.includes('adfunded') ||
        lower.includes('adsupport') || lower.includes('adsupported')) return 'Ad-Supported';

    // Bundled services (Hulu, Tesla, audiobooks, etc.)
    if (lower.includes('bundle') || lower.includes('bundled')) return 'Bundled Services';

    // Premium / Individual tiers
    if (lower.includes('premium') || lower.includes('hifi') || lower.includes('individual') ||
        lower.includes('basic') || lower === 'individual') return 'Premium Streaming';

    // Downloads
    if (lower.includes('download')) return 'Downloads';

    // Mid-tier
    if (lower.includes('midtier') || lower.includes('plus')) return 'Mid-Tier';

    return 'Other';
  };

  // Group and aggregate service types
  const groupedServiceTypes = serviceTypes?.reduce((acc: Record<string, number>, s: any) => {
    const category = categorizeServiceType(s.name);
    acc[category] = (acc[category] || 0) + s.revenue;
    return acc;
  }, {}) || {};

  const serviceTypePieData = Object.entries(groupedServiceTypes)
    .map(([name, value], i) => ({
      name,
      value: value as number,
      fill: COLORS[i % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Full timeline data for theater mode
  const fullTimelineData = timeline?.map((t: any) => ({
    month: t.month.replace(/^\d{4}-/, ''),
    fullMonth: t.month,
    revenue: Number(t.revenue) || 0,
    netRevenue: Number(t.netRevenue) || 0,
    count: Number(t.count) || 0,
  })) || [];

  // Windowed timeline data (3 months at a time) with navigation
  const MONTHS_TO_SHOW = 3;
  const startIndex = Math.max(0, fullTimelineData.length - MONTHS_TO_SHOW + timelineMonthOffset);
  const endIndex = Math.min(fullTimelineData.length, startIndex + MONTHS_TO_SHOW);
  const timelineAreaData = fullTimelineData.slice(startIndex, endIndex);

  // Navigation helpers
  const canGoBack = startIndex > 0;
  const canGoForward = timelineMonthOffset < 0;

  const goToPreviousMonths = () => {
    if (canGoBack) setTimelineMonthOffset(prev => prev - 1);
  };

  const goToNextMonths = () => {
    if (canGoForward) setTimelineMonthOffset(prev => prev + 1);
  };

  // Format month for display (e.g., "2024-01" -> "Jan 2024")
  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex] || month} ${year}`;
  };

  // Get month range label for display
  const getMonthRangeLabel = () => {
    if (timelineAreaData.length === 0) return 'No data';
    const first = timelineAreaData[0]?.fullMonth || '';
    const last = timelineAreaData[timelineAreaData.length - 1]?.fullMonth || '';
    const formattedFirst = formatMonthLabel(first);
    const formattedLast = formatMonthLabel(last);
    return formattedFirst === formattedLast ? formattedFirst : `${formattedFirst} - ${formattedLast}`;
  };

  const topSongsBarData = topSongs?.slice(0, 10).map((s: any) => ({
    title: s.title.length > 20 ? s.title.slice(0, 20) + '...' : s.title,
    fullTitle: s.title,
    revenue: Number(s.revenue) || 0,
    performances: Number(s.performances) || 0,
    platforms: Number(s.platformCount) || 0,
  })) || [];

  const territoryData = territories?.map((t: any, i: number) => ({
    name: t.territory,
    revenue: Number(t.revenue) || 0,
    fill: COLORS[i % COLORS.length],
  })) || [];

  // Radial bar data for use types
  const useTypeRadialData = useTypes?.slice(0, 5).map((u: any, i: number) => ({
    name: u.type.length > 20 ? u.type.slice(0, 20) + '...' : u.type,
    value: Number(u.revenue) || 0,
    fill: COLORS[i % COLORS.length],
  })) || [];

  const currencyFormat = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Title className="text-white text-2xl flex items-center gap-2">
              <Disc className="w-6 h-6 text-emerald-400" />
              MLC Analytics
            </Title>
            <Text className="text-gray-400">Mechanical Licensing Collective statement analysis</Text>
          </div>
          <Flex className="gap-3" alignItems="center">
            {/* Dev Mode Mock Data Toggle - only visible in development */}
            {isDev && (
              <button
                onClick={() => setUseMockData(!useMockData)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  useMockData
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {useMockData ? '🧪 Mock Data ON' : '🔌 Live Data'}
              </button>
            )}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              (kpis?.totalStatements || 0) > 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                (kpis?.totalStatements || 0) > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
              }`} />
              <span className="font-semibold">{kpis?.totalStatements || 0}</span>
              <span className="text-gray-400">Statements Processed</span>
            </div>
          </Flex>
        </Flex>
      </div>

      {/* Mock Data Warning Banner */}
      {useMockData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          <Text className="text-amber-400 text-sm">
            Dev Mode: Displaying mock data for testing. Toggle off to see real data.
          </Text>
        </div>
      )}

      {/* KPI Cards */}
      <Grid numItemsSm={2} numItemsMd={4} numItemsLg={5} className="gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Total Revenue</Text>
              <Metric className="text-white text-2xl mt-1">{currencyFormat(kpis?.totalRevenue || 0)}</Metric>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Net Revenue</Text>
              <Metric className="text-white text-2xl mt-1">{currencyFormat(kpis?.totalNetRevenue || 0)}</Metric>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Unique Songs</Text>
              <Metric className="text-white text-2xl mt-1">{(kpis?.uniqueSongs || 0).toLocaleString()}</Metric>
            </div>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Music className="w-5 h-5 text-purple-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Platforms</Text>
              <Metric className="text-white text-2xl mt-1">{kpis?.uniquePlatforms || 0}</Metric>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Avg/Item</Text>
              <Metric className="text-white text-2xl mt-1">{currencyFormat(kpis?.avgRevenuePerItem || 0)}</Metric>
            </div>
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Revenue Timeline Area Chart */}
      <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title className="text-white mb-1">Revenue Timeline</Title>
            <Text className="text-gray-500 text-sm">Monthly gross and net revenue</Text>
          </div>
          <div className="flex items-center gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonths}
                disabled={!canGoBack}
                className={`p-1.5 rounded-lg transition-colors ${
                  canGoBack
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                title="Previous months"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-400 text-xs px-2 min-w-[100px] text-center">
                {getMonthRangeLabel()}
              </span>
              <button
                onClick={goToNextMonths}
                disabled={!canGoForward}
                className={`p-1.5 rounded-lg transition-colors ${
                  canGoForward
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                title="Next months"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Legend */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                <span className="text-gray-400 text-xs">Gross</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30" />
                <span className="text-gray-400 text-xs">Net</span>
              </div>
            </div>
            {/* Theater mode button */}
            <ExpandButton onClick={() => setTheaterChart('timeline')} />
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineAreaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                dy={10}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Gross Revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                filter="url(#glow)"
                dot={false}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="netRevenue"
                name="Net Revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorNet)"
                filter="url(#glow)"
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Platform Breakdown - Custom Shape Bar Chart */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title className="text-white mb-1">Top Platforms by Revenue</Title>
              <Text className="text-gray-500 text-sm">Gross vs Net comparison (top 10)</Text>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-gray-400 text-xs">Gross</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                  <span className="text-gray-400 text-xs">Net</span>
                </div>
              </div>
              <ExpandButton onClick={() => setTheaterChart('platforms')} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGrossGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#34d399" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="barNetGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#a7f3d0" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={85}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar
                  dataKey="revenue"
                  name="Gross"
                  fill="url(#barGrossGrad)"
                  radius={[0, 6, 6, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="netRevenue"
                  name="Net"
                  fill="url(#barNetGrad)"
                  radius={[0, 6, 6, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Service Type Pie Chart */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title className="text-white mb-1">Service Type Distribution</Title>
              <Text className="text-gray-500 text-sm">Revenue by streaming tier/offering</Text>
            </div>
            <ExpandButton onClick={() => setTheaterChart('serviceTypes')} />
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="h-56 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {COLORS.map((color, i) => (
                      <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1}/>
                        <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={serviceTypePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={55}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={1}
                  >
                    {serviceTypePieData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => currencyFormat(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1">
              <CustomPieLegend data={serviceTypePieData} />
            </div>
          </div>
        </Card>
      </Grid>

      {/* Top Songs - Composed Chart */}
      <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title className="text-white mb-1">Top Performing Songs</Title>
            <Text className="text-gray-500 text-sm">Revenue and platform distribution (top 10)</Text>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-violet-500" />
                <span className="text-gray-400 text-xs">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-amber-500" />
                <span className="text-gray-400 text-xs">Platforms</span>
              </div>
            </div>
            <ExpandButton onClick={() => setTheaterChart('topSongs')} />
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={topSongsBarData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="topSongsGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={1}/>
                </linearGradient>
                <filter id="songGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.4"/>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                fontSize={10}
                tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                dataKey="title"
                type="category"
                stroke="#9ca3af"
                fontSize={10}
                width={130}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#d1d5db' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="url(#topSongsGrad)"
                radius={[0, 8, 8, 0]}
                barSize={16}
                filter="url(#songGlow)"
              />
              <Line
                type="monotone"
                dataKey="platforms"
                name="Platforms"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 5, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Territory Treemap & Use Type Radial */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Territory Treemap */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title className="text-white mb-1">Revenue by Territory</Title>
              <Text className="text-gray-500 text-sm">Geographic distribution of earnings</Text>
            </div>
            <ExpandButton onClick={() => setTheaterChart('territory')} />
          </div>
          <div className="h-72 rounded-xl overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={territoryData}
                dataKey="revenue"
                aspectRatio={4 / 3}
                stroke="transparent"
                content={<CustomTreemapContent />}
              />
            </ResponsiveContainer>
          </div>
          {/* Territory mini legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {territoryData.slice(0, 5).map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400 text-xs">{t.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Use Type Horizontal Bar Chart */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title className="text-white mb-1">Use Type Breakdown</Title>
              <Text className="text-gray-500 text-sm">Revenue by consumption type</Text>
            </div>
            <ExpandButton onClick={() => setTheaterChart('useType')} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={useTypeRadialData}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
              >
                <defs>
                  {COLORS.slice(0, 5).map((color, i) => (
                    <linearGradient key={i} id={`useTypeGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={color} stopOpacity={1}/>
                    </linearGradient>
                  ))}
                  <filter id="useTypeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.3"/>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#d1d5db' }}
                />
                <Tooltip
                  formatter={(value: number) => currencyFormat(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#9ca3af' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar
                  dataKey="value"
                  name="Revenue"
                  radius={[0, 8, 8, 0]}
                  barSize={28}
                  filter="url(#useTypeGlow)"
                >
                  {useTypeRadialData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`url(#useTypeGrad-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Total summary */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Total Use Type Revenue</span>
            <span className="text-white font-semibold">
              {currencyFormat(useTypeRadialData.reduce((sum: number, item: any) => sum + item.value, 0))}
            </span>
          </div>
        </Card>
      </Grid>

      {/* Advanced Charts Row - Platform Radar & Revenue Scatter */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Platform Rankings - Simple comparison */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white mb-1">Platform Rankings</Title>
            <Text className="text-gray-500 text-sm">Top platforms ranked by revenue</Text>
          </div>
          <div className="space-y-3">
            {platformBarData.slice(0, 6).map((p: any, i: number) => {
              const maxRevenue = platformBarData[0]?.revenue || 1;
              const percentage = (p.revenue / maxRevenue) * 100;
              return (
                <div key={p.name} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-white font-medium text-sm">{p.fullName}</span>
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">
                      ${p.revenue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500 text-xs">
                      Net: ${p.netRevenue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-gray-500 text-xs">{percentage.toFixed(0)}% of top</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Revenue Efficiency Scatter - Actual MLC data */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white mb-1">Song Revenue Efficiency</Title>
            <Text className="text-gray-500 text-sm">Revenue vs Performances - bubble size = platform count</Text>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="scatterGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="performances"
                  name="Performances"
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  label={{ value: 'Performances', position: 'bottom', fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  label={{ value: 'Revenue', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                />
                <ZAxis
                  type="number"
                  dataKey="platforms"
                  range={[100, 400]}
                  name="Platforms"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#6b7280' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl">
                          <p className="text-white font-semibold text-sm mb-2">{data.fullTitle || data.title}</p>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-xs">Revenue: <span className="text-emerald-400 font-medium">${data.revenue?.toLocaleString()}</span></p>
                            <p className="text-gray-400 text-xs">Performances: <span className="text-blue-400 font-medium">{data.performances?.toLocaleString()}</span></p>
                            <p className="text-gray-400 text-xs">Platforms: <span className="text-violet-400 font-medium">{data.platforms}</span></p>
                            <p className="text-gray-400 text-xs">$/Performance: <span className="text-amber-400 font-medium">${((data.revenue || 0) / (data.performances || 1) * 1000).toFixed(3)}</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Songs"
                  data={topSongsBarData}
                  fill="url(#scatterGrad)"
                  stroke="#8b5cf6"
                  strokeWidth={1}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Summary stats */}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Avg Revenue</p>
              <p className="text-white font-semibold text-sm">
                {currencyFormat(topSongsBarData.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0) / (topSongsBarData.length || 1))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Avg Performances</p>
              <p className="text-white font-semibold text-sm">
                {Math.round(topSongsBarData.reduce((sum: number, s: any) => sum + (s.performances || 0), 0) / (topSongsBarData.length || 1)).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Avg Platforms</p>
              <p className="text-white font-semibold text-sm">
                {(topSongsBarData.reduce((sum: number, s: any) => sum + (s.platforms || 0), 0) / (topSongsBarData.length || 1)).toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      </Grid>

      {/* Commission Summary */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-white/[0.05] to-emerald-600/5 border-emerald-500/20 ring-0 relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <Flex justifyContent="between" alignItems="center" className="relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Title className="text-white">Commission Summary</Title>
            </div>
            <Text className="text-gray-400">Total commission earned from MLC statements</Text>
          </div>
          <div className="text-right">
            <Metric className="text-emerald-400 text-3xl font-bold">{currencyFormat(kpis?.totalCommission || 0)}</Metric>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="px-2 py-0.5 bg-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
                {kpis?.marginPercentage || 0}% margin
              </span>
            </div>
          </div>
        </Flex>
      </Card>

      {/* Theater Mode Overlays */}
      {/* Revenue Timeline Theater */}
      <TheaterMode
        isOpen={theaterChart === 'timeline'}
        onClose={() => setTheaterChart(null)}
        title="Revenue Timeline - All Months"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fullTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorRevenueTheater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNetTheater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="fullMonth" stroke="#9ca3af" fontSize={12} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRevenueTheater)" />
              <Area type="monotone" dataKey="netRevenue" name="Net Revenue" stroke="#3b82f6" strokeWidth={3} fill="url(#colorNetTheater)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </TheaterMode>

      {/* Platforms Theater */}
      <TheaterMode
        isOpen={theaterChart === 'platforms'}
        onClose={() => setTheaterChart(null)}
        title="Platform Revenue Breakdown"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformBarData} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tickLine={false} />
              <YAxis dataKey="fullName" type="category" stroke="#9ca3af" fontSize={12} width={120} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Gross" fill="#10b981" radius={[0, 8, 8, 0]} barSize={20} />
              <Bar dataKey="netRevenue" name="Net" fill="#6ee7b7" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TheaterMode>

      {/* Service Types Theater */}
      <TheaterMode
        isOpen={theaterChart === 'serviceTypes'}
        onClose={() => setTheaterChart(null)}
        title="Service Type Distribution"
      >
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-4xl flex gap-8">
            <div className="flex-1 h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceTypePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={180}
                    innerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={1}
                  >
                    {serviceTypePieData.map((_entry: any, index: number) => (
                      <Cell key={`cell-theater-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => currencyFormat(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex items-center">
              <CustomPieLegend data={serviceTypePieData} />
            </div>
          </div>
        </div>
      </TheaterMode>

      {/* Top Songs Theater */}
      <TheaterMode
        isOpen={theaterChart === 'topSongs'}
        onClose={() => setTheaterChart(null)}
        title="Top Performing Songs"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={topSongsBarData} layout="vertical" margin={{ left: 40, right: 50, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} tickLine={false} />
              <YAxis dataKey="fullTitle" type="category" stroke="#9ca3af" fontSize={11} width={180} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={24} />
              <Line type="monotone" dataKey="platforms" name="Platforms" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </TheaterMode>

      {/* Territory Theater */}
      <TheaterMode
        isOpen={theaterChart === 'territory'}
        onClose={() => setTheaterChart(null)}
        title="Revenue by Territory"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={territoryData}
              dataKey="revenue"
              aspectRatio={16 / 9}
              stroke="transparent"
              content={<CustomTreemapContent />}
            />
          </ResponsiveContainer>
        </div>
      </TheaterMode>

      {/* Use Type Theater */}
      <TheaterMode
        isOpen={theaterChart === 'useType'}
        onClose={() => setTheaterChart(null)}
        title="Use Type Breakdown"
      >
        <div className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={useTypeRadialData} layout="vertical" margin={{ left: 40, right: 50, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={160} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => currencyFormat(value)} contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="value" name="Revenue" radius={[0, 8, 8, 0]} barSize={36}>
                {useTypeRadialData.map((_: any, index: number) => (
                  <Cell key={`cell-use-theater-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TheaterMode>
    </div>
  );
}
