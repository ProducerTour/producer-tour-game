/**
 * Analytics Tab with Tremor Components
 * Premium analytics dashboard with KPIs, charts, and detailed breakdowns
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableFoot,
  TableFooterCell,
} from '@tremor/react';
import { ChevronDown, ChevronUp, Maximize2, X } from 'lucide-react';
import { dashboardApi } from '../../lib/api';
import { TerritoryHeatmap } from '../TerritoryHeatmap';
import { ChartCard } from '../ChartCard';
import { NivoLineChart, NivoBarChart, NivoPieChart } from '../charts';

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Mock data for development/testing - only used when no real data exists
const MOCK_PLATFORM_DATA = {
  platforms: [
    { platform: 'Spotify', revenue: 45230.50, netRevenue: 38445.93, count: 1250, offerings: ['Premium', 'Ad-Supported', 'Family Plan'] },
    { platform: 'Apple Music', revenue: 32150.75, netRevenue: 27328.14, count: 890, offerings: ['Individual', 'Family', 'Student'] },
    { platform: 'Amazon Music', revenue: 18420.30, netRevenue: 15657.26, count: 520, offerings: ['Unlimited', 'Prime', 'HD'] },
    { platform: 'YouTube Music', revenue: 15890.20, netRevenue: 13506.67, count: 680, offerings: ['Premium', 'Ad-Supported'] },
    { platform: 'Tidal', revenue: 8750.40, netRevenue: 7437.84, count: 210, offerings: ['HiFi', 'HiFi Plus'] },
    { platform: 'Deezer', revenue: 6230.15, netRevenue: 5295.63, count: 180, offerings: ['Premium', 'Family', 'HiFi'] },
    { platform: 'Pandora', revenue: 4120.80, netRevenue: 3502.68, count: 320, offerings: ['Plus', 'Premium'] },
    { platform: 'SoundCloud', revenue: 2890.25, netRevenue: 2456.71, count: 150, offerings: ['Go', 'Go+'] },
    { platform: 'iHeartRadio', revenue: 1850.60, netRevenue: 1573.01, count: 95, offerings: ['All Access'] },
    { platform: 'Audiomack', revenue: 980.45, netRevenue: 833.38, count: 75, offerings: ['Premium'] },
  ],
  serviceTypes: [
    { serviceType: 'Premium Streaming', revenue: 89500.25, netRevenue: 76075.21, count: 2850 },
    { serviceType: 'Ad-Supported', revenue: 28750.40, netRevenue: 24437.84, count: 1420 },
    { serviceType: 'Family Plans', revenue: 12890.15, netRevenue: 10956.63, count: 580 },
    { serviceType: 'Student Plans', revenue: 4230.80, netRevenue: 3596.18, count: 320 },
    { serviceType: 'HiFi/Lossless', revenue: 3150.60, netRevenue: 2678.01, count: 180 },
  ],
  totalRevenue: 136513.40,
  totalNetRevenue: 116037.25,
  totalCount: 4370,
};

const MOCK_STATS_DATA = {
  revenueTimeline: [
    { month: 'Jan 2024', revenue: 12500 },
    { month: 'Feb 2024', revenue: 14200 },
    { month: 'Mar 2024', revenue: 13800 },
    { month: 'Apr 2024', revenue: 15600 },
    { month: 'May 2024', revenue: 18200 },
    { month: 'Jun 2024', revenue: 21500 },
    { month: 'Jul 2024', revenue: 19800 },
    { month: 'Aug 2024', revenue: 22100 },
    { month: 'Sep 2024', revenue: 24500 },
    { month: 'Oct 2024', revenue: 26800 },
    { month: 'Nov 2024', revenue: 28200 },
  ],
  proBreakdown: [
    { proType: 'MLC', revenue: 85000, count: 12 },
    { proType: 'ASCAP', revenue: 32000, count: 8 },
    { proType: 'BMI', revenue: 28500, count: 6 },
    { proType: 'SESAC', revenue: 8200, count: 3 },
  ],
  totalRevenue: 153700,
  totalNet: 130645,
  totalCommission: 23055,
  writerCount: 45,
  songCount: 320,
  statementCount: 29,
};

const MOCK_ORGANIZATION_DATA = {
  organizations: [
    { organization: 'Universal Music', revenue: 42500.30, count: 850 },
    { organization: 'Sony Music', revenue: 38200.15, count: 720 },
    { organization: 'Warner Music', revenue: 28750.40, count: 580 },
    { organization: 'Independent', revenue: 18500.25, count: 420 },
    { organization: 'BMG Rights', revenue: 8200.80, count: 180 },
  ],
  totalRevenue: 136151.90,
  totalCount: 2750,
};

const MOCK_TERRITORY_DATA = {
  territories: [
    { territory: 'US', territoryName: 'United States', revenue: 68500.25, count: 1850 },
    { territory: 'GB', territoryName: 'United Kingdom', revenue: 18200.40, count: 420 },
    { territory: 'DE', territoryName: 'Germany', revenue: 12500.15, count: 380 },
    { territory: 'FR', territoryName: 'France', revenue: 9800.30, count: 290 },
    { territory: 'CA', territoryName: 'Canada', revenue: 8500.20, count: 250 },
    { territory: 'AU', territoryName: 'Australia', revenue: 6200.45, count: 180 },
    { territory: 'JP', territoryName: 'Japan', revenue: 5100.80, count: 150 },
    { territory: 'BR', territoryName: 'Brazil', revenue: 3800.25, count: 120 },
    { territory: 'MX', territoryName: 'Mexico', revenue: 2400.60, count: 95 },
    { territory: 'ES', territoryName: 'Spain', revenue: 1500.00, count: 65 },
  ],
  totalRevenue: 136501.40,
  totalCount: 3800,
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
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[95vw] max-w-7xl h-[85vh] bg-[#19181a] border border-white/5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Yellow top accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white text-xl font-light">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f0e226]/10 transition-colors text-white/40 hover:text-[#f0e226]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
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
    className="p-2 hover:bg-[#f0e226]/10 transition-colors text-white/40 hover:text-[#f0e226]"
    title="Open in theater mode"
  >
    <Maximize2 className="w-4 h-4" />
  </button>
);

export default function AnalyticsTabTremor() {
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [platformTableExpanded, setPlatformTableExpanded] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [theaterChart, setTheaterChart] = useState<string | null>(null);

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Data queries
  const { data: apiStats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  const { data: apiPlatformData, isLoading: platformLoading } = useQuery({
    queryKey: ['platform-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getPlatformBreakdown();
      return response.data;
    },
  });

  const { data: apiOrganizationData, isLoading: organizationLoading } = useQuery({
    queryKey: ['organization-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getOrganizationBreakdown();
      return response.data;
    },
  });

  const { data: apiTerritoryData, isLoading: territoryLoading } = useQuery({
    queryKey: ['territory-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getTerritoryBreakdown();
      return response.data;
    },
  });

  // Use mock data in dev mode when toggled or when no real data exists
  const stats = useMockData ? MOCK_STATS_DATA : apiStats;
  const platformData = useMockData ? MOCK_PLATFORM_DATA : apiPlatformData;
  const organizationData = useMockData ? MOCK_ORGANIZATION_DATA : apiOrganizationData;
  const territoryData = useMockData ? MOCK_TERRITORY_DATA : apiTerritoryData;

  // Currency formatter for tooltips
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Transform data for Nivo charts
  // Line chart format: { id, data: [{ x, y }] }
  // Filter to show only previous quarter (last 3 months of data)
  const getRevenueTimelineData = () => {
    if (!stats?.revenueTimeline) return [];
    // Get only the last 3 months (previous quarter)
    const lastThreeMonths = stats.revenueTimeline.slice(-3);
    return [{
      id: 'Revenue',
      data: lastThreeMonths.map((item: any) => ({
        x: item.month,
        y: Number(item.revenue) || 0,
      })),
    }];
  };

  // Get the date range for the quarter label
  const getQuarterLabel = () => {
    if (!stats?.revenueTimeline || stats.revenueTimeline.length < 1) return 'Previous Quarter';
    const lastThreeMonths = stats.revenueTimeline.slice(-3);
    if (lastThreeMonths.length === 0) return 'Previous Quarter';
    const firstMonth = lastThreeMonths[0]?.month || '';
    const lastMonth = lastThreeMonths[lastThreeMonths.length - 1]?.month || '';
    if (firstMonth === lastMonth) return firstMonth;
    return `${firstMonth} - ${lastMonth}`;
  };

  // Pie chart format: { id, label, value }
  const getProBreakdownData = () => {
    if (!stats?.proBreakdown) return [];
    return stats.proBreakdown.map((item: any) => ({
      id: item.proType,
      label: item.proType,
      value: Number(item.revenue) || 0,
    }));
  };

  // Bar chart format: { indexKey, ...values }
  const getProBarChartData = () => {
    if (!stats?.proBreakdown) return [];
    return stats.proBreakdown.map((item: any) => ({
      proType: item.proType,
      Revenue: Number(item.revenue) || 0,
      Statements: item.count || 0,
    }));
  };

  const getPlatformPieData = () => {
    if (!platformData?.platforms) return [];
    return platformData.platforms.map((item: any) => ({
      id: item.platform,
      label: item.platform,
      value: Number(item.revenue) || 0,
    }));
  };


  // Service type pie chart data
  const getServiceTypePieData = () => {
    if (!platformData?.serviceTypes) return [];
    return platformData.serviceTypes.map((item: any) => ({
      id: item.serviceType,
      label: item.serviceType,
      value: Number(item.revenue) || 0,
    }));
  };

  // Platform comparison bar chart data (gross vs net)
  const getPlatformComparisonData = () => {
    if (!platformData?.platforms) return [];
    return platformData.platforms.slice(0, 8).map((item: any) => ({
      platform: item.platform.length > 12 ? item.platform.slice(0, 12) + '...' : item.platform,
      'Gross Revenue': Number(item.revenue) || 0,
      'Net Revenue': Number(item.netRevenue) || 0,
    }));
  };

  // Calculate margin percentage
  const getMarginPercent = (gross: number, net: number) => {
    if (gross === 0) return 0;
    return ((gross - net) / gross * 100).toFixed(1);
  };

  const getOrganizationPieData = () => {
    if (!organizationData?.organizations) return [];
    return organizationData.organizations.map((item: any) => ({
      id: item.organization,
      label: item.organization,
      value: Number(item.revenue) || 0,
    }));
  };

  const getOrganizationBarData = () => {
    if (!organizationData?.organizations) return [];
    return organizationData.organizations.map((item: any) => ({
      organization: item.organization,
      Revenue: Number(item.revenue) || 0,
      Statements: item.count || 0,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#f0e226]/20 border-t-[#f0e226] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-light text-white">Platform Analytics</h1>
          <p className="text-white/40 mt-1">Comprehensive overview of platform performance</p>
        </div>
        {/* Dev Mode Mock Data Toggle - only visible in development */}
        {isDev && (
          <button
            onClick={() => setUseMockData(!useMockData)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
              useMockData
                ? 'bg-[#f0e226]/15 text-[#f0e226] border border-[#f0e226]/30'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}
          >
            {useMockData ? 'Mock Data ON' : 'Live Data'}
          </button>
        )}
      </div>
      {useMockData && (
        <div className="bg-[#f0e226]/10 border border-[#f0e226]/30 px-4 py-2">
          <p className="text-[#f0e226] text-sm">
            Dev Mode: Displaying mock data for testing. Toggle off to see real data.
          </p>
        </div>
      )}

      {/* Financial Summary - Revenue, Net, Commission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300 border-t-2 border-t-[#f0e226]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Gross Revenue</p>
              <p className="text-3xl font-light text-white">{currencyFormatter(Number(stats?.totalRevenue || 0))}</p>
            </div>
            <div className="w-14 h-14 bg-[#f0e226]/10 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300 border-t-2 border-t-[#f0e226]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Net to Writers</p>
              <p className="text-3xl font-light text-white">{currencyFormatter(Number(stats?.totalNet || 0))}</p>
            </div>
            <div className="w-14 h-14 bg-[#f0e226]/10 flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300 border-t-2 border-t-[#f0e226]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Commission</p>
              <p className="text-3xl font-light text-white">{currencyFormatter(Number(stats?.totalCommission || 0))}</p>
            </div>
            <div className="w-14 h-14 bg-[#f0e226]/10 flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Other Stats - KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-4 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Writers</p>
              <p className="text-2xl font-light text-white">{stats?.totalWriters || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#f0e226]/10 flex items-center justify-center text-lg">👥</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-4 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Statements</p>
              <p className="text-2xl font-light text-white">{stats?.totalStatements || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#f0e226]/10 flex items-center justify-center text-lg">📊</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-4 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Processed</p>
              <p className="text-2xl font-light text-white">{stats?.processedStatements || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#f0e226]/10 flex items-center justify-center text-lg">✅</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-4 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Unique Works</p>
              <p className="text-2xl font-light text-white">{stats?.uniqueWorks || 0}</p>
            </div>
            <div className="w-8 h-8 bg-[#f0e226]/10 flex items-center justify-center text-lg">🎵</div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-4 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Revenue</p>
              <p className="text-xl font-light text-white">
                ${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-8 h-8 bg-[#f0e226]/10 flex items-center justify-center text-lg">💰</div>
          </div>
        </div>
      </div>

      {/* Revenue & PRO Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Timeline - Previous Quarter */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-white">Revenue Over Time</h3>
              <p className="text-sm text-white/40">{getQuarterLabel()}</p>
            </div>
            <ExpandButton onClick={() => setTheaterChart('revenue')} />
          </div>
          {getRevenueTimelineData().length > 0 && getRevenueTimelineData()[0]?.data?.length > 0 ? (
            <NivoLineChart
              data={getRevenueTimelineData()}
              height={288}
              enableArea={true}
              colors={['#f0e226']}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-white/30">
              No revenue data available
            </div>
          )}
        </div>

        {/* PRO Breakdown Pie */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-white">Revenue by PRO</h3>
              <p className="text-sm text-white/40">Distribution across PROs</p>
            </div>
            <ExpandButton onClick={() => setTheaterChart('pro')} />
          </div>
          {getProBreakdownData().length > 0 ? (
            <NivoPieChart
              data={getProBreakdownData()}
              height={208}
              innerRadius={0.5}
              enableArcLinkLabels={getProBreakdownData().length <= 5}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-52 flex items-center justify-center text-white/30">
              No PRO data available
            </div>
          )}
        </div>
      </div>

      {/* PRO Statistics Bar Chart */}
      {getProBarChartData().length > 0 && (
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="mb-4">
            <h3 className="text-lg font-normal text-white">PRO Statistics</h3>
            <p className="text-sm text-white/40">Revenue and statement count by PRO</p>
          </div>
          <NivoBarChart
            data={getProBarChartData()}
            keys={['Revenue']}
            indexBy="proType"
            height={288}
            colors={['#f0e226']}
            valueFormat={currencyFormatter}
          />
        </div>
      )}

      {/* Platform Breakdown Section - Redesigned */}
      {!platformLoading && platformData?.platforms?.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-light text-white">Platform & Service Analytics</h2>
            <p className="text-white/40">Revenue breakdown by streaming platform and service type</p>
          </div>

          {/* Distribution Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Platform Distribution Pie */}
            <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-normal text-white">Platform Distribution</h3>
                  <p className="text-sm text-white/40">Revenue share by streaming service</p>
                </div>
                <ExpandButton onClick={() => setTheaterChart('platform')} />
              </div>
              <NivoPieChart
                data={getPlatformPieData()}
                height={220}
                innerRadius={0.5}
                enableArcLinkLabels={getPlatformPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </div>

            {/* Service Type Distribution Pie */}
            <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-normal text-white">Service Type Mix</h3>
                  <p className="text-sm text-white/40">Premium vs Ad-Supported vs other tiers</p>
                </div>
                <ExpandButton onClick={() => setTheaterChart('serviceType')} />
              </div>
              {getServiceTypePieData().length > 0 ? (
                <NivoPieChart
                  data={getServiceTypePieData()}
                  height={220}
                  innerRadius={0.5}
                  enableArcLinkLabels={getServiceTypePieData().length <= 6}
                  valueFormat={currencyFormatter}
                />
              ) : (
                <div className="h-52 flex items-center justify-center text-white/30">
                  No service type data available
                </div>
              )}
            </div>
          </div>

          {/* Platform Comparison Bar Chart - Gross vs Net */}
          <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <h3 className="text-lg font-normal text-white mb-2">Platform Revenue Comparison</h3>
            <p className="text-sm text-white/40 mb-4">Gross vs Net revenue by platform (top 8)</p>
            <NivoBarChart
              data={getPlatformComparisonData()}
              keys={['Gross Revenue', 'Net Revenue']}
              indexBy="platform"
              height={280}
              layout="vertical"
              groupMode="grouped"
              colors={['#f0e226', '#f0e226aa']}
              valueFormat={currencyFormatter}
            />
          </div>

          {/* Top Platforms Metric Cards */}
          <div>
            <h3 className="text-lg font-normal text-white mb-4">Top Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {platformData.platforms.slice(0, 8).map((platform: any, index: number) => {
                const marginPct = getMarginPercent(platform.revenue, platform.netRevenue);
                const isTopPlatform = index < 3;
                return (
                  <div
                    key={platform.platform}
                    className={`relative overflow-hidden bg-[#19181a] border p-4 group hover:border-[#f0e226]/30 transition-all duration-300 ${isTopPlatform ? 'border-[#f0e226]/30' : 'border-white/5'}`}
                  >
                    <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white/40 uppercase tracking-wider truncate">
                          {platform.platform}
                        </p>
                        <p className="text-lg font-light text-white mt-1">
                          ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {isTopPlatform && (
                        <span className="px-2 py-0.5 bg-[#f0e226]/15 text-[#f0e226] text-xs font-medium">#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex justify-between mt-3">
                      <span className="text-xs text-white/30">
                        {platform.count.toLocaleString()} items
                      </span>
                      <span className="text-xs text-white/30">
                        {marginPct}% margin
                      </span>
                    </div>
                    {/* Service Type Tags */}
                    {platform.offerings?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {platform.offerings.slice(0, 2).map((offering: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white/[0.08] text-[10px] text-white/40">
                            {offering.length > 15 ? offering.slice(0, 15) + '...' : offering}
                          </span>
                        ))}
                        {platform.offerings.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-white/[0.06] text-[10px] text-white/30">
                            +{platform.offerings.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Platform Details Table */}
          <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <button
              onClick={() => setPlatformTableExpanded(!platformTableExpanded)}
              className="w-full"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-normal text-white text-left">Detailed Breakdown</h3>
                  <p className="text-sm text-white/40 text-left">
                    {platformData.platforms.length} platform{platformData.platforms.length !== 1 ? 's' : ''} • Click to {platformTableExpanded ? 'collapse' : 'expand'}
                  </p>
                </div>
                <div className="p-2 hover:bg-[#f0e226]/10 transition-colors">
                  {platformTableExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </div>
            </button>

            {platformTableExpanded && (
              <div className="mt-4">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="text-white/40 uppercase tracking-wider text-xs">Platform</TableHeaderCell>
                      <TableHeaderCell className="text-white/40 uppercase tracking-wider text-xs">Service Types</TableHeaderCell>
                      <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Items</TableHeaderCell>
                      <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Gross</TableHeaderCell>
                      <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Net</TableHeaderCell>
                      <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Margin</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {platformData.platforms.map((platform: any) => {
                      const marginPct = getMarginPercent(platform.revenue, platform.netRevenue);
                      return (
                        <TableRow key={platform.platform}>
                          <TableCell className="text-white font-medium">{platform.platform}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {platform.offerings?.length > 0 ? (
                                platform.offerings.slice(0, 3).map((offering: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/[0.08] text-xs text-white/60">
                                    {offering}
                                  </span>
                                ))
                              ) : (
                                <span className="text-white/30">-</span>
                              )}
                              {platform.offerings?.length > 3 && (
                                <span className="px-2 py-0.5 bg-white/[0.06] text-xs text-white/30">
                                  +{platform.offerings.length - 3}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-white/60">{platform.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-[#f0e226] font-medium">
                            ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-[#f0e226]/70">
                            ${Number(platform.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-xs ${Number(marginPct) > 15 ? 'text-[#f0e226]' : 'text-white/40'}`}>
                              {marginPct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFoot>
                    <TableRow>
                      <TableFooterCell className="text-white font-bold uppercase tracking-wider">TOTAL</TableFooterCell>
                      <TableFooterCell></TableFooterCell>
                      <TableFooterCell className="text-right text-white font-bold">
                        {platformData.totalCount.toLocaleString()}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-[#f0e226] font-bold">
                        ${Number(platformData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-[#f0e226]/70 font-bold">
                        ${Number(platformData.totalNetRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-white/40 font-bold">
                        {getMarginPercent(platformData.totalRevenue, platformData.totalNetRevenue || 0)}%
                      </TableFooterCell>
                    </TableRow>
                  </TableFoot>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organization Breakdown Section */}
      {!organizationLoading && organizationData?.organizations?.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-light text-white">Revenue by Organization</h2>
            <p className="text-white/40">Breakdown by collecting organization</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Organization Pie */}
            <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
              <h3 className="text-lg font-normal text-white mb-4">Organization Distribution</h3>
              <NivoPieChart
                data={getOrganizationPieData()}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={getOrganizationPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </div>

            {/* Organization Bar Chart */}
            <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
              <h3 className="text-lg font-normal text-white mb-4">Organization Revenue</h3>
              <NivoBarChart
                data={getOrganizationBarData()}
                keys={['Revenue']}
                indexBy="organization"
                height={208}
                colors={['#f0e226']}
                valueFormat={currencyFormatter}
              />
            </div>
          </div>

          {/* Organization Details Table */}
          <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <h3 className="text-lg font-normal text-white mb-4">Organization Details</h3>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="text-white/40 uppercase tracking-wider text-xs">Organization</TableHeaderCell>
                  <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Statements</TableHeaderCell>
                  <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Revenue</TableHeaderCell>
                  <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Net</TableHeaderCell>
                  <TableHeaderCell className="text-right text-white/40 uppercase tracking-wider text-xs">Commission</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizationData.organizations.map((org: any) => (
                  <TableRow key={org.organization}>
                    <TableCell className="text-white font-medium">{org.organization}</TableCell>
                    <TableCell className="text-right text-white/60">{org.count}</TableCell>
                    <TableCell className="text-right text-[#f0e226] font-medium">
                      ${Number(org.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-[#f0e226]/70">
                      ${Number(org.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-white/50">
                      ${Number(org.commissionAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableFooterCell className="text-white font-bold uppercase tracking-wider">Total</TableFooterCell>
                  <TableFooterCell className="text-right text-white font-bold">
                    {organizationData.totalCount}
                  </TableFooterCell>
                  <TableFooterCell className="text-right text-[#f0e226] font-bold">
                    ${Number(organizationData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                </TableRow>
              </TableFoot>
            </Table>
          </div>
        </div>
      )}

      {/* Territory Revenue Heatmap */}
      <div>
        <h2 className="text-xl font-light text-white mb-2">Revenue by Territory</h2>
        <p className="text-white/40 mb-4">Global distribution of earnings</p>
        <ChartCard
          title="Global Revenue Heatmap"
          chartId="territory-heatmap"
          isExpanded={expandedCharts['territory-heatmap'] || false}
          onToggleExpand={toggleChartExpansion}
        >
          {territoryLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#f0e226]/20 border-t-[#f0e226] rounded-full animate-spin" />
            </div>
          ) : territoryData?.territories?.length > 0 ? (
            <TerritoryHeatmap territories={territoryData.territories} />
          ) : (
            <div className="h-full flex items-center justify-center text-white/30">
              No territory data available yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Statements */}
      {stats?.recentStatements?.length > 0 && (
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="mb-4">
            <h3 className="text-lg font-normal text-white">Recent Statements</h3>
            <p className="text-sm text-white/40">Latest processed statements</p>
          </div>
          <div className="space-y-3 mt-4">
            {stats.recentStatements.map((statement: any) => (
              <div key={statement.id} className="flex items-center justify-between p-3 bg-black/30 hover:bg-black/50 transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <span className={`px-2 py-1 text-xs font-medium ${
                    statement.proType === 'BMI' ? 'bg-white/10 text-white/70' :
                    statement.proType === 'ASCAP' ? 'bg-white/10 text-white/70' :
                    'bg-white/10 text-white/70'
                  }`}>
                    {statement.proType}
                  </span>
                  <span className="text-white truncate">{statement.filename}</span>
                  <span className={`px-2 py-1 text-xs font-medium ${
                    statement.status === 'PUBLISHED' ? 'bg-[#f0e226]/15 text-[#f0e226]' :
                    statement.status === 'PROCESSED' ? 'bg-[#f0e226]/10 text-[#f0e226]/70' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {statement.status}
                  </span>
                </div>
                <span className="text-[#f0e226] font-light text-lg">
                  ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theater Mode Overlays */}
      {/* Revenue Timeline Theater */}
      <TheaterMode
        isOpen={theaterChart === 'revenue'}
        onClose={() => setTheaterChart(null)}
        title="Revenue Over Time - All Data"
      >
        <div className="h-full">
          {stats?.revenueTimeline?.length > 0 ? (
            <NivoLineChart
              data={[{
                id: 'Revenue',
                data: stats.revenueTimeline.map((item: any) => ({
                  x: item.month,
                  y: Number(item.revenue) || 0,
                })),
              }]}
              height={600}
              enableArea={true}
              colors={['#f0e226']}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-white/30">
              No revenue data available
            </div>
          )}
        </div>
      </TheaterMode>

      {/* PRO Breakdown Theater */}
      <TheaterMode
        isOpen={theaterChart === 'pro'}
        onClose={() => setTheaterChart(null)}
        title="Revenue by PRO"
      >
        <div className="h-full flex items-center justify-center">
          {getProBreakdownData().length > 0 ? (
            <div className="w-full max-w-4xl">
              <NivoPieChart
                data={getProBreakdownData()}
                height={500}
                innerRadius={0.5}
                enableArcLinkLabels={true}
                valueFormat={currencyFormatter}
              />
            </div>
          ) : (
            <div className="text-white/30">No PRO data available</div>
          )}
        </div>
      </TheaterMode>

      {/* Platform Distribution Theater */}
      <TheaterMode
        isOpen={theaterChart === 'platform'}
        onClose={() => setTheaterChart(null)}
        title="Platform Revenue Distribution"
      >
        <div className="h-full flex items-center justify-center">
          {getPlatformPieData().length > 0 ? (
            <div className="w-full max-w-4xl">
              <NivoPieChart
                data={getPlatformPieData()}
                height={500}
                innerRadius={0.5}
                enableArcLinkLabels={true}
                valueFormat={currencyFormatter}
              />
            </div>
          ) : (
            <div className="text-white/30">No platform data available</div>
          )}
        </div>
      </TheaterMode>

      {/* Service Type Theater */}
      <TheaterMode
        isOpen={theaterChart === 'serviceType'}
        onClose={() => setTheaterChart(null)}
        title="Service Type Distribution"
      >
        <div className="h-full flex items-center justify-center">
          {getServiceTypePieData().length > 0 ? (
            <div className="w-full max-w-4xl">
              <NivoPieChart
                data={getServiceTypePieData()}
                height={500}
                innerRadius={0.5}
                enableArcLinkLabels={true}
                valueFormat={currencyFormatter}
              />
            </div>
          ) : (
            <div className="text-white/30">No service type data available</div>
          )}
        </div>
      </TheaterMode>
    </div>
  );
}
