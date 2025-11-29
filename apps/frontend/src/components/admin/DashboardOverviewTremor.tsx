/**
 * Dashboard Overview with Tremor Components
 * Modern analytics dashboard using Tremor UI
 */

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  BadgeDelta,
  List,
  ListItem,
  Bold,
} from '@tremor/react';
import type { DeltaType } from '@tremor/react';
import { dashboardApi, statementApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { NivoPieChart, RechartsRevenueChart } from '../charts';

// Smart currency formatter
const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface KpiData {
  title: string;
  value: string | number;
  icon: string;
  delta?: string;
  deltaType: DeltaType;
  color: 'blue' | 'cyan' | 'rose' | 'amber';
}

export default function DashboardOverviewTremor() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  const { data: statementsData } = useQuery({
    queryKey: ['recent-statements'],
    queryFn: async () => {
      const response = await statementApi.list();
      return response.data;
    },
  });

  const recentStatements = statementsData?.statements?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  // Financial summary data (Revenue, Net, Commission)
  const financialKpis: KpiData[] = [
    {
      title: 'Gross Revenue',
      value: formatCurrency(Number(stats?.totalRevenue || 0)),
      icon: '💰',
      delta: stats?.totalRevenueChange !== null && stats?.totalRevenueChange !== undefined
        ? `${stats.totalRevenueChange > 0 ? '+' : ''}${stats.totalRevenueChange}%`
        : undefined,
      deltaType: stats?.totalRevenueTrend === 'up' ? 'increase' : stats?.totalRevenueTrend === 'down' ? 'decrease' : 'unchanged',
      color: 'blue',
    },
    {
      title: 'Net to Writers',
      value: formatCurrency(Number(stats?.totalNet || 0)),
      icon: '💵',
      deltaType: 'unchanged',
      color: 'cyan',
    },
    {
      title: 'Commission',
      value: formatCurrency(Number(stats?.totalCommission || 0)),
      icon: '📈',
      deltaType: 'unchanged',
      color: 'amber',
    },
  ];

  // Prepare KPI data (other stats)
  const kpis: KpiData[] = [
    {
      title: 'Total Writers',
      value: stats?.totalWriters || 0,
      icon: '👥',
      delta: stats?.totalWritersChange !== null && stats?.totalWritersChange !== undefined
        ? `${stats.totalWritersChange > 0 ? '+' : ''}${stats.totalWritersChange}%`
        : undefined,
      deltaType: stats?.totalWritersTrend === 'up' ? 'increase' : stats?.totalWritersTrend === 'down' ? 'decrease' : 'unchanged',
      color: 'cyan',
    },
    {
      title: 'Active Statements',
      value: stats?.processedStatements || 0,
      icon: '📊',
      delta: stats?.processedStatementsChange !== null && stats?.processedStatementsChange !== undefined
        ? `${stats.processedStatementsChange > 0 ? '+' : ''}${stats.processedStatementsChange}%`
        : undefined,
      deltaType: stats?.processedStatementsTrend === 'up' ? 'increase' : stats?.processedStatementsTrend === 'down' ? 'decrease' : 'unchanged',
      color: 'rose',
    },
    {
      title: 'Unique Works',
      value: stats?.uniqueWorks || 0,
      icon: '🎵',
      delta: stats?.uniqueWorksChange !== null && stats?.uniqueWorksChange !== undefined
        ? `${stats.uniqueWorksChange > 0 ? '+' : ''}${stats.uniqueWorksChange}%`
        : undefined,
      deltaType: stats?.uniqueWorksTrend === 'up' ? 'increase' : stats?.uniqueWorksTrend === 'down' ? 'decrease' : 'unchanged',
      color: 'amber',
    },
  ];

  // Prepare Recharts revenue chart data
  const revenueChartData = stats?.revenueTimeline?.map((item: any) => ({
    month: item.month,
    revenue: Number(item.revenue) || 0,
  })) || [];

  // Prepare Nivo pie chart data
  const proDistribution = stats?.statementsByPRO?.map((item: any) => ({
    id: item.proType,
    label: item.proType,
    value: item.count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Financial Summary - Revenue, Net, Commission */}
      <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
        {financialKpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={cn(
              'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
              'border-white/[0.08] ring-0'
            )}
            decoration="top"
            decorationColor={kpi.color}
          >
            <Flex alignItems="start">
              <div className="truncate">
                <Text className="text-gray-400">{kpi.title}</Text>
                <Metric className="text-white mt-1 truncate text-2xl">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </Metric>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-2xl shrink-0">
                {kpi.icon}
              </div>
            </Flex>
            {kpi.delta && (
              <Flex className="mt-4 space-x-2">
                <BadgeDelta deltaType={kpi.deltaType} size="xs">
                  {kpi.delta}
                </BadgeDelta>
                <Text className="text-gray-500 text-xs">vs last period</Text>
              </Flex>
            )}
          </Card>
        ))}
      </Grid>

      {/* Other Stats - Writers, Statements, Works */}
      <Grid numItemsSm={3} numItemsLg={3} className="gap-6">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={cn(
              'bg-gradient-to-b from-white/[0.06] to-white/[0.02]',
              'border-white/[0.06] ring-0'
            )}
          >
            <Flex alignItems="start">
              <div className="truncate">
                <Text className="text-gray-500 text-sm">{kpi.title}</Text>
                <Metric className="text-white mt-1 truncate text-xl">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </Metric>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
                {kpi.icon}
              </div>
            </Flex>
            {kpi.delta && (
              <Flex className="mt-3 space-x-2">
                <BadgeDelta deltaType={kpi.deltaType} size="xs">
                  {kpi.delta}
                </BadgeDelta>
                <Text className="text-gray-500 text-xs">vs last period</Text>
              </Flex>
            )}
          </Card>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Revenue Area Chart */}
        <Card
          className={cn(
            'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
            'border-white/[0.08] ring-0'
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title className="text-white">Revenue Overview</Title>
              <Text className="text-gray-400">Monthly revenue trend</Text>
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <RechartsRevenueChart
              data={revenueChartData}
              height={288}
              color="#3b82f6"
              gradientId="adminRevenueGradient"
            />
          ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
              No revenue data available
            </div>
          )}
        </Card>

        {/* PRO Distribution Donut */}
        <Card
          className={cn(
            'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
            'border-white/[0.08] ring-0'
          )}
        >
          <Title className="text-white">Statement Distribution</Title>
          <Text className="text-gray-400">By PRO type</Text>
          {proDistribution.length > 0 ? (
            <>
              <NivoPieChart
                data={proDistribution}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={proDistribution.length <= 5}
                valueFormat={(value) => value.toLocaleString()}
              />
              <List className="mt-4">
                {proDistribution.map((item: any) => {
                  const total = proDistribution.reduce((acc: number, curr: any) => acc + curr.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <ListItem key={item.id}>
                      <Flex justifyContent="start" className="truncate space-x-2.5">
                        <span className="text-gray-300">{item.label}</span>
                      </Flex>
                      <Text className="text-gray-400">
                        {item.value} <span className="text-gray-500">({percentage}%)</span>
                      </Text>
                    </ListItem>
                  );
                })}
              </List>
            </>
          ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
              No statement data available
            </div>
          )}
        </Card>
      </Grid>

      {/* Recent Statements */}
      <Card
        className={cn(
          'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
          'border-white/[0.08] ring-0'
        )}
      >
        <Flex>
          <div>
            <Title className="text-white">Recent Statements</Title>
            <Text className="text-gray-400">Latest processed statements</Text>
          </div>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            View All →
          </button>
        </Flex>
        <List className="mt-4">
          {recentStatements.length > 0 ? (
            recentStatements.map((statement: any) => (
              <ListItem key={statement.id}>
                <Flex justifyContent="start" className="truncate space-x-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    statement.proType === 'BMI' ? 'bg-blue-500/20' :
                    statement.proType === 'ASCAP' ? 'bg-cyan-500/20' :
                    'bg-violet-500/20'
                  )}>
                    <span className="text-lg">📊</span>
                  </div>
                  <div className="truncate">
                    <Text className="text-white truncate">
                      <Bold>{statement.filename}</Bold>
                    </Text>
                    <Text className="text-gray-500">
                      {statement.proType} • {statement.itemCount || 0} items
                    </Text>
                  </div>
                </Flex>
                <div className="text-right">
                  <Text className="text-emerald-400 font-semibold">
                    ${Number(statement.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {new Date(statement.createdAt).toLocaleDateString()}
                  </Text>
                </div>
              </ListItem>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent statements
            </div>
          )}
        </List>
      </Card>
    </div>
  );
}
