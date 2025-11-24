/**
 * Analytics Tab with Tremor Components
 * Premium analytics dashboard with KPIs, charts, and detailed breakdowns
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
  List,
  ListItem,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableFoot,
  TableFooterCell,
  Badge,
} from '@tremor/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

export default function AnalyticsTabTremor() {
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const [platformTableExpanded, setPlatformTableExpanded] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

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
  const getRevenueTimelineData = () => {
    if (!stats?.revenueTimeline) return [];
    return [{
      id: 'Revenue',
      data: stats.revenueTimeline.map((item: any) => ({
        x: item.month,
        y: Number(item.revenue) || 0,
      })),
    }];
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
    return <div className="text-center text-text-secondary py-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Title className="text-white text-2xl">Platform Analytics</Title>
          <Text className="text-gray-400">Comprehensive overview of platform performance</Text>
        </div>
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
      </Flex>
      {useMockData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          <Text className="text-amber-400 text-sm">
            Dev Mode: Displaying mock data for testing. Toggle off to see real data.
          </Text>
        </div>
      )}

      {/* Financial Summary - Revenue, Net, Commission */}
      <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="blue"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Gross Revenue</Text>
              <Metric className="text-white mt-1">
                {currencyFormatter(Number(stats?.totalRevenue || 0))}
              </Metric>
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-2xl">💰</div>
          </Flex>
        </Card>
        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="cyan"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Net to Writers</Text>
              <Metric className="text-white mt-1">
                {currencyFormatter(Number(stats?.totalNet || 0))}
              </Metric>
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-2xl">💵</div>
          </Flex>
        </Card>
        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="amber"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Commission</Text>
              <Metric className="text-white mt-1">
                {currencyFormatter(Number(stats?.totalCommission || 0))}
              </Metric>
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-2xl">📈</div>
          </Flex>
        </Card>
      </Grid>

      {/* Other Stats - KPI Cards Grid */}
      <Grid numItemsSm={2} numItemsMd={3} numItemsLg={5} className="gap-4">
        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="blue"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Writers</Text>
              <Metric className="text-white mt-1">{stats?.totalWriters || 0}</Metric>
            </div>
            <div className="text-2xl">👥</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="emerald"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Statements</Text>
              <Metric className="text-white mt-1">{stats?.totalStatements || 0}</Metric>
            </div>
            <div className="text-2xl">📊</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="violet"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Processed</Text>
              <Metric className="text-white mt-1">{stats?.processedStatements || 0}</Metric>
            </div>
            <div className="text-2xl">✅</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="amber"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Unique Works</Text>
              <Metric className="text-white mt-1">{stats?.uniqueWorks || 0}</Metric>
            </div>
            <div className="text-2xl">🎵</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="cyan"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Revenue</Text>
              <Metric className="text-white mt-1 text-lg">
                ${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Metric>
            </div>
            <div className="text-2xl">💰</div>
          </Flex>
        </Card>
      </Grid>

      {/* Revenue & PRO Charts Row */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Revenue Timeline */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Revenue Over Time</Title>
            <Text className="text-gray-400">12-month revenue trend</Text>
          </div>
          {getRevenueTimelineData().length > 0 && getRevenueTimelineData()[0]?.data?.length > 0 ? (
            <NivoLineChart
              data={getRevenueTimelineData()}
              height={288}
              enableArea={true}
              colors={['#10b981']}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </Card>

        {/* PRO Breakdown Pie */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Revenue by PRO</Title>
            <Text className="text-gray-400">Distribution across PROs</Text>
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
            <div className="h-52 flex items-center justify-center text-gray-400">
              No PRO data available
            </div>
          )}
        </Card>
      </Grid>

      {/* PRO Statistics Bar Chart */}
      {getProBarChartData().length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">PRO Statistics</Title>
            <Text className="text-gray-400">Revenue and statement count by PRO</Text>
          </div>
          <NivoBarChart
            data={getProBarChartData()}
            keys={['Revenue']}
            indexBy="proType"
            height={288}
            colors={['#10b981']}
            valueFormat={currencyFormatter}
          />
        </Card>
      )}

      {/* Platform Breakdown Section - Redesigned */}
      {!platformLoading && platformData?.platforms?.length > 0 && (
        <div className="space-y-6">
          <div>
            <Title className="text-white text-xl">Platform & Service Analytics</Title>
            <Text className="text-gray-400">Revenue breakdown by streaming platform and service type</Text>
          </div>

          {/* Distribution Charts Row */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
            {/* Platform Distribution Pie */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Platform Distribution</Title>
              <Text className="text-gray-400 text-sm mb-4">Revenue share by streaming service</Text>
              <NivoPieChart
                data={getPlatformPieData()}
                height={220}
                innerRadius={0.5}
                enableArcLinkLabels={getPlatformPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </Card>

            {/* Service Type Distribution Pie */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Service Type Mix</Title>
              <Text className="text-gray-400 text-sm mb-4">Premium vs Ad-Supported vs other tiers</Text>
              {getServiceTypePieData().length > 0 ? (
                <NivoPieChart
                  data={getServiceTypePieData()}
                  height={220}
                  innerRadius={0.5}
                  enableArcLinkLabels={getServiceTypePieData().length <= 6}
                  valueFormat={currencyFormatter}
                />
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400">
                  No service type data available
                </div>
              )}
            </Card>
          </Grid>

          {/* Platform Comparison Bar Chart - Gross vs Net */}
          <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
            <Title className="text-white mb-2">Platform Revenue Comparison</Title>
            <Text className="text-gray-400 text-sm mb-4">Gross vs Net revenue by platform (top 8)</Text>
            <NivoBarChart
              data={getPlatformComparisonData()}
              keys={['Gross Revenue', 'Net Revenue']}
              indexBy="platform"
              height={280}
              layout="vertical"
              groupMode="grouped"
              colors={['#10b981', '#6ee7b7']}
              valueFormat={currencyFormatter}
            />
          </Card>

          {/* Top Platforms Metric Cards */}
          <div>
            <Title className="text-white mb-4">Top Platforms</Title>
            <Grid numItemsSm={2} numItemsMd={3} numItemsLg={4} className="gap-4">
              {platformData.platforms.slice(0, 8).map((platform: any, index: number) => {
                const marginPct = getMarginPercent(platform.revenue, platform.netRevenue);
                const isTopPlatform = index < 3;
                return (
                  <Card
                    key={platform.platform}
                    className={`bg-gradient-to-b ${isTopPlatform ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-white/[0.08] to-white/[0.02] border-white/[0.08]'} ring-0`}
                  >
                    <Flex justifyContent="between" alignItems="start">
                      <div className="min-w-0 flex-1">
                        <Text className="text-gray-400 text-xs uppercase tracking-wide truncate">
                          {platform.platform}
                        </Text>
                        <Metric className="text-white mt-1 text-lg">
                          ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Metric>
                      </div>
                      {isTopPlatform && (
                        <Badge color="emerald" size="xs">#{index + 1}</Badge>
                      )}
                    </Flex>
                    <Flex justifyContent="between" className="mt-3">
                      <Text className="text-gray-500 text-xs">
                        {platform.count.toLocaleString()} items
                      </Text>
                      <Flex justifyContent="end" className="gap-1">
                        <Text className="text-gray-500 text-xs">
                          {marginPct}% margin
                        </Text>
                      </Flex>
                    </Flex>
                    {/* Service Type Tags */}
                    {platform.offerings?.length > 0 && (
                      <Flex justifyContent="start" className="gap-1 mt-2 flex-wrap">
                        {platform.offerings.slice(0, 2).map((offering: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white/[0.08] rounded text-[10px] text-gray-400">
                            {offering.length > 15 ? offering.slice(0, 15) + '...' : offering}
                          </span>
                        ))}
                        {platform.offerings.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] text-gray-500">
                            +{platform.offerings.length - 2}
                          </span>
                        )}
                      </Flex>
                    )}
                  </Card>
                );
              })}
            </Grid>
          </div>

          {/* Collapsible Platform Details Table */}
          <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
            <button
              onClick={() => setPlatformTableExpanded(!platformTableExpanded)}
              className="w-full"
            >
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Title className="text-white text-left">Detailed Breakdown</Title>
                  <Text className="text-gray-400 text-left">
                    {platformData.platforms.length} platform{platformData.platforms.length !== 1 ? 's' : ''} • Click to {platformTableExpanded ? 'collapse' : 'expand'}
                  </Text>
                </div>
                <div className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  {platformTableExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </Flex>
            </button>

            {platformTableExpanded && (
              <div className="mt-4">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="text-gray-400">Platform</TableHeaderCell>
                      <TableHeaderCell className="text-gray-400">Service Types</TableHeaderCell>
                      <TableHeaderCell className="text-right text-gray-400">Items</TableHeaderCell>
                      <TableHeaderCell className="text-right text-gray-400">Gross</TableHeaderCell>
                      <TableHeaderCell className="text-right text-gray-400">Net</TableHeaderCell>
                      <TableHeaderCell className="text-right text-gray-400">Margin</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {platformData.platforms.map((platform: any) => {
                      const marginPct = getMarginPercent(platform.revenue, platform.netRevenue);
                      return (
                        <TableRow key={platform.platform}>
                          <TableCell className="text-white font-semibold">{platform.platform}</TableCell>
                          <TableCell>
                            <Flex justifyContent="start" className="gap-1 flex-wrap">
                              {platform.offerings?.length > 0 ? (
                                platform.offerings.slice(0, 3).map((offering: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/[0.08] rounded-lg text-xs text-gray-300">
                                    {offering}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                              {platform.offerings?.length > 3 && (
                                <span className="px-2 py-0.5 bg-white/[0.06] rounded-lg text-xs text-gray-500">
                                  +{platform.offerings.length - 3}
                                </span>
                              )}
                            </Flex>
                          </TableCell>
                          <TableCell className="text-right text-gray-300">{platform.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-emerald-400 font-semibold">
                            ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-emerald-300">
                            ${Number(platform.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-xs ${Number(marginPct) > 15 ? 'text-amber-400' : 'text-gray-400'}`}>
                              {marginPct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFoot>
                    <TableRow>
                      <TableFooterCell className="text-white font-bold">TOTAL</TableFooterCell>
                      <TableFooterCell></TableFooterCell>
                      <TableFooterCell className="text-right text-white font-bold">
                        {platformData.totalCount.toLocaleString()}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-emerald-400 font-bold">
                        ${Number(platformData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-emerald-300 font-bold">
                        ${Number(platformData.totalNetRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableFooterCell>
                      <TableFooterCell className="text-right text-gray-400 font-bold">
                        {getMarginPercent(platformData.totalRevenue, platformData.totalNetRevenue || 0)}%
                      </TableFooterCell>
                    </TableRow>
                  </TableFoot>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Organization Breakdown Section */}
      {!organizationLoading && organizationData?.organizations?.length > 0 && (
        <div className="space-y-6">
          <div>
            <Title className="text-white">Revenue by Organization</Title>
            <Text className="text-gray-400">Breakdown by collecting organization</Text>
          </div>

          <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
            {/* Organization Pie */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Organization Distribution</Title>
              <NivoPieChart
                data={getOrganizationPieData()}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={getOrganizationPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </Card>

            {/* Organization Bar Chart */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Organization Revenue</Title>
              <NivoBarChart
                data={getOrganizationBarData()}
                keys={['Revenue']}
                indexBy="organization"
                height={208}
                colors={['#8b5cf6']}
                valueFormat={currencyFormatter}
              />
            </Card>
          </Grid>

          {/* Organization Details Table */}
          <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
            <Title className="text-white mb-4">Organization Details</Title>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="text-gray-400">Organization</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Statements</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Revenue</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Net</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Commission</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizationData.organizations.map((org: any) => (
                  <TableRow key={org.organization}>
                    <TableCell className="text-white font-medium">{org.organization}</TableCell>
                    <TableCell className="text-right text-gray-300">{org.count}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">
                      ${Number(org.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-emerald-300">
                      ${Number(org.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-blue-400">
                      ${Number(org.commissionAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableFooterCell className="text-white font-bold">Total</TableFooterCell>
                  <TableFooterCell className="text-right text-white font-bold">
                    {organizationData.totalCount}
                  </TableFooterCell>
                  <TableFooterCell className="text-right text-emerald-400 font-bold">
                    ${Number(organizationData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                </TableRow>
              </TableFoot>
            </Table>
          </Card>
        </div>
      )}

      {/* Territory Revenue Heatmap */}
      <div>
        <Title className="text-white mb-2">Revenue by Territory</Title>
        <Text className="text-gray-400 mb-4">Global distribution of earnings</Text>
        <ChartCard
          title="Global Revenue Heatmap"
          chartId="territory-heatmap"
          isExpanded={expandedCharts['territory-heatmap'] || false}
          onToggleExpand={toggleChartExpansion}
        >
          {territoryLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading territory data...
            </div>
          ) : territoryData?.territories?.length > 0 ? (
            <TerritoryHeatmap territories={territoryData.territories} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No territory data available yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Statements */}
      {stats?.recentStatements?.length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Recent Statements</Title>
            <Text className="text-gray-400">Latest processed statements</Text>
          </div>
          <List className="mt-4">
            {stats.recentStatements.map((statement: any) => (
              <ListItem key={statement.id}>
                <Flex justifyContent="start" className="truncate space-x-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statement.proType === 'BMI' ? 'bg-blue-500/20 text-blue-400' :
                    statement.proType === 'ASCAP' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-violet-500/20 text-violet-400'
                  }`}>
                    {statement.proType}
                  </span>
                  <Text className="text-white truncate">{statement.filename}</Text>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statement.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' :
                    statement.status === 'PROCESSED' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {statement.status}
                  </span>
                </Flex>
                <Text className="text-emerald-400 font-semibold">
                  ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </div>
  );
}
