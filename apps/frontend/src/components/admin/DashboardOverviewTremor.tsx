/**
 * Dashboard Overview with Tremor Components
 * Theme-aware styling via CSS variables (see config/themes.ts)
 */

import { useQuery } from '@tanstack/react-query';
import type { DeltaType } from '@tremor/react';
import { dashboardApi, statementApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import { NivoPieChart, RechartsRevenueChart } from '../charts';
import { TrendingUp, TrendingDown, Minus, Users, FileText, Music, DollarSign, Wallet, Percent } from 'lucide-react';

// Smart currency formatter
const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Theme-aware KPI Card component
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
      "relative overflow-hidden bg-theme-card border border-theme-border p-6 group",
      "hover:border-theme-border-hover transition-all duration-300",
      large && "border-t-2 border-t-theme-primary"
    )}>
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-theme-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top accent line animation on hover */}
      <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">{title}</p>
          <p className={cn(
            "font-light text-theme-foreground",
            large ? "text-3xl" : "text-2xl"
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {delta && deltaType && (
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
                deltaType === 'increase' && "bg-theme-primary/15 text-theme-primary border border-theme-primary/30",
                deltaType === 'decrease' && "bg-theme-border-strong text-theme-foreground-secondary border border-theme-border",
                deltaType === 'unchanged' && "bg-theme-border-strong text-theme-foreground-muted border border-theme-border"
              )}>
                {deltaType === 'increase' && <TrendingUp className="w-3 h-3" />}
                {deltaType === 'decrease' && <TrendingDown className="w-3 h-3" />}
                {deltaType === 'unchanged' && <Minus className="w-3 h-3" />}
                {delta}
              </span>
              <span className="text-xs text-theme-foreground-muted">vs last period</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center shrink-0",
          "bg-theme-primary/10 group-hover:bg-theme-primary/20 transition-colors",
          large ? "w-14 h-14" : "w-10 h-10"
        )}>
          <Icon className={cn(
            "text-theme-primary",
            large ? "w-7 h-7" : "w-5 h-5"
          )} />
        </div>
      </div>
    </div>
  );
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
        <div className="text-theme-foreground-muted">Loading dashboard...</div>
      </div>
    );
  }

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
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary/50 to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-normal text-theme-foreground">Cumulative Revenue</h3>
              <p className="text-sm text-theme-foreground-muted">Total revenue over time</p>
            </div>
            <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <RechartsRevenueChart
              data={revenueChartData}
              height={288}
              color="var(--theme-primary)"
              gradientId="adminRevenueGradient"
            />
          ) : (
            <div className="flex items-center justify-center h-72 text-theme-foreground-muted">
              No revenue data available
            </div>
          )}
        </div>

        {/* PRO Distribution Donut */}
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary/50 to-transparent" />

          <h3 className="text-lg font-normal text-theme-foreground">Statement Distribution</h3>
          <p className="text-sm text-theme-foreground-muted mb-4">By PRO type</p>
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
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-theme-border last:border-0">
                      <span className="text-theme-foreground-secondary text-sm">{item.label}</span>
                      <span className="text-theme-foreground-muted text-sm">
                        {item.value} <span className="text-theme-foreground-muted">({percentage}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-72 text-theme-foreground-muted">
              No statement data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Statements */}
      <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary/50 to-transparent" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-normal text-theme-foreground">Recent Statements</h3>
            <p className="text-sm text-theme-foreground-muted">Latest processed statements</p>
          </div>
          <button className="text-theme-primary hover:text-theme-foreground text-sm font-medium uppercase tracking-wider transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {recentStatements.length > 0 ? (
            recentStatements.map((statement: any) => (
              <div key={statement.id} className="flex items-center justify-between p-3 bg-theme-background/30 hover:bg-theme-background/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="truncate">
                    <p className="text-theme-foreground text-sm font-medium truncate">{statement.filename}</p>
                    <p className="text-theme-foreground-muted text-xs">
                      {statement.proType} • {statement.itemCount || 0} items
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-theme-primary font-light text-lg">
                    ${Number(statement.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-theme-foreground-muted text-xs">
                    {new Date(statement.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-theme-foreground-muted">
              No recent statements
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
