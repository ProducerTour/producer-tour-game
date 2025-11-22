/**
 * Dashboard Bar Chart
 * Tremor-based bar chart for categorical data
 */

import { Card, Title, BarChart, Subtitle } from '@tremor/react';
import { cn } from '../../lib/utils';

interface DataPoint {
  [key: string]: string | number;
}

interface DashboardBarChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  categories: string[];
  index: string;
  colors?: ('blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'fuchsia' | 'lime' | 'indigo')[];
  valueFormatter?: (value: number) => string;
  layout?: 'vertical' | 'horizontal';
  stack?: boolean;
  showLegend?: boolean;
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString();

export function DashboardBarChart({
  title,
  subtitle,
  data,
  categories,
  index,
  colors = ['blue'],
  valueFormatter = defaultFormatter,
  layout = 'horizontal',
  stack = false,
  showLegend = true,
  className,
}: DashboardBarChartProps) {
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
        {subtitle && <Subtitle className="text-gray-400">{subtitle}</Subtitle>}
      </div>
      <BarChart
        className="h-72 mt-4"
        data={data}
        index={index}
        categories={categories}
        colors={colors}
        valueFormatter={valueFormatter}
        layout={layout}
        stack={stack}
        showLegend={showLegend}
      />
    </Card>
  );
}
