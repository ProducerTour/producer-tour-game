/**
 * Recharts Revenue Chart Component
 * Beautiful area chart with gradient fill for revenue trends
 * Cassette theme styling with yellow (#f0e226) accents
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface RechartsRevenueChartProps {
  data: RevenueDataPoint[];
  height?: number;
  showGrid?: boolean;
  color?: string;
  gradientId?: string;
  /** Pad data with empty months to show context (default: 6) */
  minMonths?: number;
  /** Use light mode colors (for white backgrounds) */
  lightMode?: boolean;
}

// Custom tooltip component - Cassette theme
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-theme-card border border-theme-border-strong p-4 shadow-2xl">
        <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2 pb-2 border-b border-theme-border">
          {label}
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2"
              style={{
                backgroundColor: payload[0].color,
              }}
            />
            <span className="text-theme-foreground-muted text-sm">Revenue</span>
          </div>
          <span className="text-theme-primary font-light text-lg">
            ${payload[0].value?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function RechartsRevenueChart({
  data,
  height = 288,
  showGrid = true,
  color = '#f0e226', // Cassette yellow
  gradientId = 'revenueGradient',
  minMonths = 6,
  lightMode = false,
}: RechartsRevenueChartProps) {
  // Color scheme based on mode
  const colors = lightMode ? {
    gridStroke: 'rgba(0, 0, 0, 0.05)',
    axisStroke: 'rgba(0, 0, 0, 0.1)',
    tickFill: 'rgba(0, 0, 0, 0.5)',
    cursorStroke: '#9ca3af',
  } : {
    gridStroke: 'rgba(255, 255, 255, 0.05)',
    axisStroke: 'rgba(255, 255, 255, 0.1)',
    tickFill: 'rgba(255, 255, 255, 0.4)',
    cursorStroke: '#6b7280',
  };
  // Format currency for Y axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  // Format month label (2024-01 -> Jan '24)
  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(m, 10) - 1;
    return `${monthNames[monthIndex]} '${year.slice(-2)}`;
  };

  // Pad data with previous months if we have less than minMonths
  const getPaddedData = (): RevenueDataPoint[] => {
    if (data.length >= minMonths) return data;

    // Create a map of existing data
    const dataMap = new Map(data.map(d => [d.month, d.revenue]));

    // Find the earliest month in data, or use current month
    const now = new Date();
    let startDate: Date;

    if (data.length > 0) {
      // Sort to find earliest month
      const sortedMonths = [...data].sort((a, b) => a.month.localeCompare(b.month));
      const [year, month] = sortedMonths[0].month.split('-').map(Number);
      // Go back enough months to have minMonths total
      startDate = new Date(year, month - 1 - (minMonths - data.length), 1);
    } else {
      // No data, show last minMonths months
      startDate = new Date(now.getFullYear(), now.getMonth() - minMonths + 1, 1);
    }

    // Generate months from startDate to now
    const paddedData: RevenueDataPoint[] = [];
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);

    let current = new Date(startDate);
    while (current <= endDate && paddedData.length < minMonths) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      paddedData.push({
        month: monthKey,
        revenue: dataMap.get(monthKey) || 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    // If we still don't have enough, add more at the end
    while (paddedData.length < minMonths) {
      current.setMonth(current.getMonth() + 1);
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      paddedData.push({
        month: monthKey,
        revenue: dataMap.get(monthKey) || 0,
      });
    }

    return paddedData;
  };

  const chartData = getPaddedData();

  // Check if we have sparse data (few points with revenue)
  const pointsWithRevenue = chartData.filter(d => d.revenue > 0).length;
  const showAllDots = pointsWithRevenue <= 3;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="50%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.gridStroke}
              strokeOpacity={1}
              vertical={false}
            />
          )}

          <XAxis
            dataKey="month"
            stroke={colors.axisStroke}
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: colors.axisStroke, strokeWidth: 1 }}
            dy={10}
            tick={{ fill: colors.tickFill }}
            tickFormatter={formatMonth}
          />

          <YAxis
            stroke={colors.axisStroke}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            dx={-5}
            tick={{ fill: colors.tickFill }}
            width={55}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: colors.cursorStroke, strokeDasharray: '4 4' }}
            labelFormatter={formatMonth}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={color}
            strokeWidth={2.5}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={showAllDots ? {
              r: 5,
              fill: color,
              stroke: '#fff',
              strokeWidth: 2,
            } : false}
            activeDot={{
              r: 7,
              fill: color,
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
