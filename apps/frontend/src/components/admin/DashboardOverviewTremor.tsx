/**
 * Dashboard Overview with Tremor Components
 * Cassette theme styling with yellow (#f0e226) accents
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
import { TrendingUp, Users, FileText, Music, DollarSign, Wallet, Percent } from 'lucide-react';

// Smart currency formatter
const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Cassette-themed KPI Card component
function CassetteKpiCard({
  title,
  value,
  icon: Icon,
  delta,
  deltaType,
  large = false
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  delta?: string;
  deltaType?: DeltaType;
  large?: boolean;
}) {
  return (
    <div className={cn(
      "relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group",
      "hover:border-[#f0e226]/30 transition-all duration-300",
      large && "border-t-2 border-t-[#f0e226]"
    )}>
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top accent line animation on hover */}
      <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">{title}</p>
          <p className={cn(
            "font-light text-white",
            large ? "text-3xl" : "text-2xl"
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {delta && deltaType && (
            <div className="mt-3 flex items-center gap-2">
              <BadgeDelta deltaType={deltaType} size="xs">
                {delta}
              </BadgeDelta>
              <span className="text-xs text-white/30">vs last period</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center shrink-0",
          "bg-[#f0e226]/10 group-hover:bg-[#f0e226]/20 transition-colors",
          large ? "w-14 h-14" : "w-10 h-10"
        )}>
          <Icon className={cn(
            "text-[#f0e226]",
            large ? "w-7 h-7" : "w-5 h-5"
          )} />
        </div>
      </div>
    </div>
  );
}

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

  // Prepare Recharts revenue chart data - CUMULATIVE (running total)
  const rawRevenueData = stats?.revenueTimeline?.map((item: any) => ({
    month: item.month,
    revenue: Number(item.revenue) || 0,
  })) || [];

  // Sort by month and calculate cumulative totals
  const sortedData = [...rawRevenueData].sort((a, b) => a.month.localeCompare(b.month));
  let runningTotal = 0;
  const revenueChartData = sortedData.map((item) => {
    runningTotal += item.revenue;
    return {
      month: item.month,
      revenue: runningTotal,
    };
  });

  // Prepare Nivo pie chart data
  const proDistribution = stats?.statementsByPRO?.map((item: any) => ({
    id: item.proType,
    label: item.proType,
    value: item.count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Financial Summary - Revenue, Net, Commission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CassetteKpiCard
          title="Gross Revenue"
          value={formatCurrency(Number(stats?.totalRevenue || 0))}
          icon={DollarSign}
          delta={stats?.totalRevenueChange !== null && stats?.totalRevenueChange !== undefined
            ? `${stats.totalRevenueChange > 0 ? '+' : ''}${stats.totalRevenueChange}%`
            : undefined}
          deltaType={stats?.totalRevenueTrend === 'up' ? 'increase' : stats?.totalRevenueTrend === 'down' ? 'decrease' : 'unchanged'}
          large
        />
        <CassetteKpiCard
          title="Net to Writers"
          value={formatCurrency(Number(stats?.totalNet || 0))}
          icon={Wallet}
          large
        />
        <CassetteKpiCard
          title="Commission"
          value={formatCurrency(Number(stats?.totalCommission || 0))}
          icon={Percent}
          large
        />
      </div>

      {/* Other Stats - Writers, Statements, Works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CassetteKpiCard
          title="Total Writers"
          value={stats?.totalWriters || 0}
          icon={Users}
          delta={stats?.totalWritersChange !== null && stats?.totalWritersChange !== undefined
            ? `${stats.totalWritersChange > 0 ? '+' : ''}${stats.totalWritersChange}%`
            : undefined}
          deltaType={stats?.totalWritersTrend === 'up' ? 'increase' : stats?.totalWritersTrend === 'down' ? 'decrease' : 'unchanged'}
        />
        <CassetteKpiCard
          title="Active Statements"
          value={stats?.processedStatements || 0}
          icon={FileText}
          delta={stats?.processedStatementsChange !== null && stats?.processedStatementsChange !== undefined
            ? `${stats.processedStatementsChange > 0 ? '+' : ''}${stats.processedStatementsChange}%`
            : undefined}
          deltaType={stats?.processedStatementsTrend === 'up' ? 'increase' : stats?.processedStatementsTrend === 'down' ? 'decrease' : 'unchanged'}
        />
        <CassetteKpiCard
          title="Unique Works"
          value={stats?.uniqueWorks || 0}
          icon={Music}
          delta={stats?.uniqueWorksChange !== null && stats?.uniqueWorksChange !== undefined
            ? `${stats.uniqueWorksChange > 0 ? '+' : ''}${stats.uniqueWorksChange}%`
            : undefined}
          deltaType={stats?.uniqueWorksTrend === 'up' ? 'increase' : stats?.uniqueWorksTrend === 'down' ? 'decrease' : 'unchanged'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Area Chart */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-normal text-white">Cumulative Revenue</h3>
              <p className="text-sm text-white/40">Total revenue over time</p>
            </div>
            <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <RechartsRevenueChart
              data={revenueChartData}
              height={288}
              color="#f0e226"
              gradientId="adminRevenueGradient"
            />
          ) : (
            <div className="flex items-center justify-center h-72 text-white/30">
              No revenue data available
            </div>
          )}
        </div>

        {/* PRO Distribution Donut */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />

          <h3 className="text-lg font-normal text-white">Statement Distribution</h3>
          <p className="text-sm text-white/40 mb-4">By PRO type</p>
          {proDistribution.length > 0 ? (
            <>
              <NivoPieChart
                data={proDistribution}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={proDistribution.length <= 5}
                valueFormat={(value) => value.toLocaleString()}
              />
              <div className="mt-4 space-y-2">
                {proDistribution.map((item: any) => {
                  const total = proDistribution.reduce((acc: number, curr: any) => acc + curr.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-white/60 text-sm">{item.label}</span>
                      <span className="text-white/40 text-sm">
                        {item.value} <span className="text-white/30">({percentage}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-72 text-white/30">
              No statement data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Statements */}
      <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-normal text-white">Recent Statements</h3>
            <p className="text-sm text-white/40">Latest processed statements</p>
          </div>
          <button className="text-[#f0e226] hover:text-white text-sm font-medium uppercase tracking-wider transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {recentStatements.length > 0 ? (
            recentStatements.map((statement: any) => (
              <div key={statement.id} className="flex items-center justify-between p-3 bg-black/30 hover:bg-black/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#f0e226]" />
                  </div>
                  <div className="truncate">
                    <p className="text-white text-sm font-medium truncate">{statement.filename}</p>
                    <p className="text-white/40 text-xs">
                      {statement.proType} • {statement.itemCount || 0} items
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#f0e226] font-light text-lg">
                    ${Number(statement.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-white/30 text-xs">
                    {new Date(statement.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-white/30">
              No recent statements
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
