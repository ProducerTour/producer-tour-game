/**
 * Dashboard Donut Chart
 * Tremor-based donut chart for distribution data
 */

import { Card, Title, DonutChart, Text, Legend } from '@tremor/react';
import { cn } from '../../lib/utils';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface DashboardDonutChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  category?: string;
  index?: string;
  colors?: ('blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'fuchsia' | 'lime' | 'indigo' | 'slate')[];
  valueFormatter?: (value: number) => string;
  showLabel?: boolean;
  variant?: 'donut' | 'pie';
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString();

export function DashboardDonutChart({
  title,
  subtitle,
  data,
  category = 'value',
  index = 'name',
  colors = ['blue', 'emerald', 'violet', 'amber', 'rose', 'cyan'],
  valueFormatter = defaultFormatter,
  showLabel = true,
  variant = 'donut',
  className,
}: DashboardDonutChartProps) {
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
      <DonutChart
        className="h-52 mt-4"
        data={data}
        category={category}
        index={index}
        colors={colors}
        valueFormatter={valueFormatter}
        showLabel={showLabel}
        variant={variant}
      />
      <Legend
        className="mt-4"
        categories={data.map(d => d[index] as string)}
        colors={colors}
      />
    </Card>
  );
}
