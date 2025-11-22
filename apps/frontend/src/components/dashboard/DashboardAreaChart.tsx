/**
 * Dashboard Area Chart
 * Tremor-based area chart for revenue/timeline data
 */

import { Card, Title, AreaChart, Text } from '@tremor/react';
import { cn } from '../../lib/utils';

interface DataPoint {
  [key: string]: string | number;
}

interface DashboardAreaChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  categories: string[];
  index: string;
  colors?: ('blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'fuchsia' | 'lime' | 'indigo')[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  className?: string;
}

const currencyFormatter = (value: number) =>
  `$${Intl.NumberFormat('us').format(value).toString()}`;

export function DashboardAreaChart({
  title,
  subtitle,
  data,
  categories,
  index,
  colors = ['blue'],
  valueFormatter = currencyFormatter,
  showLegend = true,
  showGridLines = true,
  className,
}: DashboardAreaChartProps) {
  return (
    <Card
      className={cn(
        'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
        'border-white/[0.08] ring-0',
        className
      )}
    >
      <div className="mb-4">
        <Title className="text-white">{title}</Title>
        {subtitle && <Text className="text-gray-400">{subtitle}</Text>}
      </div>
      <AreaChart
        className="h-72 mt-4"
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        showLegend={showLegend}
        showGridLines={showGridLines}
        curveType="monotone"
      />
    </Card>
  );
}
