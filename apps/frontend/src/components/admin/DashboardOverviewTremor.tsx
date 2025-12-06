/**
 * Dashboard Overview with Tremor Components
 * Theme-aware styling via CSS variables (see config/themes.ts)
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, statementApi } from '../../lib/api';
import { NivoPieChart, RechartsRevenueChart } from '../charts';
import { TrendingUp, Users, FileText, Music, DollarSign, Wallet, Percent } from 'lucide-react';

// Smart currency formatter
const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Hero card for Gross Revenue with integrated area chart
function HeroRevenueCard({ value, trend, chartData }: { value: number; trend?: number; chartData: any[] }) {
  const formattedValue = formatCurrency(value);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="adminHeroGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#adminHeroGrid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <p className="text-xs sm:text-sm font-medium text-theme-primary-foreground/70 mb-1">Gross Revenue</p>
        <p className="text-2xl sm:text-4xl font-bold text-theme-primary-foreground mb-2 sm:mb-3">{formattedValue}</p>

        {/* Trend badge */}
        {trend !== undefined && (
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-theme-primary-foreground text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{trend > 0 ? '+' : ''}{trend}% From last period</span>
          </div>
        )}
      </div>

      {/* Integrated area chart */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 opacity-40">
        <RechartsRevenueChart
          data={chartData.length > 0 ? chartData : [{ month: 'Jan', revenue: 0 }]}
          height={112}
          color="rgba(255,255,255,0.8)"
          gradientId="adminHeroRevenueGradient"
        />
      </div>
    </div>
  );
}

// Stat card matching the Writer Dashboard design
function AdminStatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'amber';
  trend?: number;
}) {
  // Color configurations for both Cassette and Light themes
  const colorConfig = {
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-500 dark:text-blue-400',
      trendBg: 'bg-blue-100 dark:bg-blue-500/20',
      trendColor: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      trendBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      trendColor: 'text-emerald-600 dark:text-emerald-400',
    },
    purple: {
      iconBg: 'bg-purple-100 dark:bg-purple-500/20',
      iconColor: 'text-purple-500 dark:text-purple-400',
      trendBg: 'bg-purple-100 dark:bg-purple-500/20',
      trendColor: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
      iconBg: 'bg-orange-100 dark:bg-orange-500/20',
      iconColor: 'text-orange-500 dark:text-orange-400',
      trendBg: 'bg-orange-100 dark:bg-orange-500/20',
      trendColor: 'text-orange-600 dark:text-orange-400',
    },
    amber: {
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-500 dark:text-amber-400',
      trendBg: 'bg-amber-100 dark:bg-amber-500/20',
      trendColor: 'text-amber-600 dark:text-amber-400',
    },
  };

  const config = colorConfig[color];
  const updateDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:border-theme-border-hover hover:shadow-lg transition-all duration-300 group">
      {/* Top row: Icon + Title */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
        </div>
        <span className="text-xs sm:text-sm font-medium text-theme-foreground-secondary">{title}</span>
      </div>

      {/* Value row with trend badge */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-xl sm:text-3xl font-bold text-theme-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold ${config.trendBg} ${config.trendColor} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* Update timestamp */}
      <p className="text-[10px] sm:text-xs text-theme-foreground-muted">
        Update: {updateDate}
      </p>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Card - Gross Revenue */}
      <HeroRevenueCard
        value={Number(stats?.totalRevenue || 0)}
        trend={stats?.totalRevenueChange}
        chartData={revenueChartData}
      />

      {/* Stats Grid - 2x3 on desktop, 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AdminStatCard
          title="Net to Writers"
          value={formatCurrency(Number(stats?.totalNet || 0))}
          icon={Wallet}
          color="green"
        />
        <AdminStatCard
          title="Commission"
          value={formatCurrency(Number(stats?.totalCommission || 0))}
          icon={Percent}
          color="amber"
        />
        <AdminStatCard
          title="Total Writers"
          value={stats?.totalWriters || 0}
          icon={Users}
          color="blue"
          trend={stats?.totalWritersChange}
        />
        <AdminStatCard
          title="Active Statements"
          value={stats?.processedStatements || 0}
          icon={FileText}
          color="purple"
          trend={stats?.processedStatementsChange}
        />
        <AdminStatCard
          title="Unique Works"
          value={stats?.uniqueWorks || 0}
          icon={Music}
          color="orange"
          trend={stats?.uniqueWorksChange}
        />
        <AdminStatCard
          title="Avg per Statement"
          value={formatCurrency(stats?.processedStatements ? Number(stats?.totalRevenue || 0) / stats.processedStatements : 0)}
          icon={DollarSign}
          color="green"
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
