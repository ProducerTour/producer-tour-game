/**
 * Writer Dashboard Overview with Tremor Layout + Nivo Charts
 * Premium dashboard experience for writers with KPIs, charts, and analytics
 */

import { Card, Title, Text, Flex, Grid, List, ListItem } from '@tremor/react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, statementApi, payoutApi } from '../../lib/api';
import { WalletCard } from '../WalletCard';
import { TerritoryHeatmap } from '../TerritoryHeatmap';
import { ChartCard } from '../ChartCard';
import { NivoPieChart, RechartsRevenueChart } from '../charts';
import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';

interface WriterOverviewTremorProps {
  onWithdrawClick: () => void;
}

export default function WriterOverviewTremor({ onWithdrawClick }: WriterOverviewTremorProps) {
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});
  const { user } = useAuthStore();

  // Format user name for card display
  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'PRODUCER TOUR MEMBER'
    : 'PRODUCER TOUR MEMBER';

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Data queries
  const { data: timelineData } = useQuery({
    queryKey: ['dashboard-timeline'],
    queryFn: async () => {
      const response = await dashboardApi.getTimeline();
      return response.data;
    },
  });

  const { data: territoryData } = useQuery({
    queryKey: ['territory-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getTerritoryBreakdown();
      return response.data;
    },
  });

  const { data: statementsData, isLoading: statementsLoading } = useQuery({
    queryKey: ['user-statements'],
    queryFn: async () => {
      const response = await statementApi.getStatements();
      return response.data;
    },
  });

  const { data: walletBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const response = await payoutApi.getBalance();
      return response.data;
    },
  });

  // Calculate PRO breakdown for pie chart (Nivo format)
  const getProBreakdown = () => {
    if (!statementsData?.statements) return [];
    const proTotals: Record<string, number> = {};
    statementsData.statements.forEach((statement: any) => {
      const revenue = Number(statement.totalRevenue);
      proTotals[statement.proType] = (proTotals[statement.proType] || 0) + revenue;
    });
    return Object.entries(proTotals).map(([name, value]) => ({
      id: name,
      label: name,
      value,
    }));
  };

  // Format timeline data for Recharts
  const getTimelineChartData = () => {
    if (!timelineData?.timeline) return [];
    return timelineData.timeline.map((item: any) => ({
      month: item.month,
      revenue: Number(item.revenue) || 0,
    }));
  };

  const proBreakdown = getProBreakdown();
  const timelineChartData = getTimelineChartData();

  return (
    <div className="space-y-8">
      {/* Wallet Card */}
      <div className="max-w-md">
        <WalletCard
          balance={walletBalance || { availableBalance: 0, pendingBalance: 0, lifetimeEarnings: 0 }}
          isLoading={balanceLoading}
          onWithdraw={onWithdrawClick}
          userName={userName}
        />
      </div>

      {/* Charts Section */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Earnings Timeline - Recharts Area Chart */}
        <Card className="bg-white border border-gray-100 shadow-sm ring-0 rounded-2xl">
          <div className="mb-4">
            <Title className="text-gray-900">Earnings Timeline</Title>
            <Text className="text-gray-500">Monthly revenue trend</Text>
          </div>
          {timelineChartData.length > 0 ? (
            <RechartsRevenueChart
              data={timelineChartData}
              height={288}
              color="#22C55E"
              gradientId="writerRevenueGradient"
              lightMode={true}
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              No earnings data available yet
            </div>
          )}
        </Card>

        {/* PRO Breakdown - Nivo Pie Chart */}
        <Card className="bg-white border border-gray-100 shadow-sm ring-0 rounded-2xl">
          <div className="mb-4">
            <Title className="text-gray-900">Revenue by PRO</Title>
            <Text className="text-gray-500">Earnings distribution by source</Text>
          </div>
          {proBreakdown.length > 0 ? (
            <NivoPieChart
              data={proBreakdown}
              height={240}
              innerRadius={0.5}
              enableArcLinkLabels={proBreakdown.length <= 5}
            />
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400">
              No statement data available yet
            </div>
          )}
        </Card>
      </Grid>

      {/* Territory Revenue Heatmap */}
      <ChartCard
        title="Global Revenue Heatmap"
        chartId="territory-heatmap"
        isExpanded={expandedCharts['territory-heatmap'] || false}
        onToggleExpand={toggleChartExpansion}
      >
        {territoryData?.territories && territoryData.territories.length > 0 ? (
          <TerritoryHeatmap territories={territoryData.territories} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            No territory data available yet. Territory information will appear once statements with location data are processed.
          </div>
        )}
      </ChartCard>

      {/* Recent Statements - Tremor List */}
      <Card className="bg-white border border-gray-100 shadow-sm ring-0 rounded-2xl">
        <div className="mb-4">
          <Title className="text-gray-900">Recent Statements</Title>
          <Text className="text-gray-500">Your latest royalty statements</Text>
        </div>
        {statementsLoading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : statementsData?.statements?.length > 0 ? (
          <List className="mt-4">
            {statementsData.statements.slice(0, 6).map((statement: any) => (
              <ListItem key={statement.id} className="border-b border-gray-100 last:border-0">
                <Flex justifyContent="start" className="truncate space-x-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    statement.proType === 'BMI' ? 'bg-blue-500' :
                    statement.proType === 'ASCAP' ? 'bg-emerald-500' :
                    statement.proType === 'SESAC' ? 'bg-violet-500' : 'bg-gray-500'
                  }`} />
                  <div className="truncate">
                    <Text className="text-gray-900 font-medium truncate">{statement.proType}</Text>
                    <Text className="text-gray-400 text-sm">
                      {statement.itemCount || 0} items • {Number(statement.totalPerformances || 0).toLocaleString()} performances
                    </Text>
                  </div>
                </Flex>
                <Text className="text-emerald-600 font-semibold">
                  ${Number(statement.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </ListItem>
            ))}
          </List>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No statements available yet
          </div>
        )}
      </Card>
    </div>
  );
}
