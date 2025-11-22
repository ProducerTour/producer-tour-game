/**
 * Metric Card Component
 * Tremor-based card for single metrics with sparkline
 */

import { Card, Metric, Text, Flex, SparkAreaChart } from '@tremor/react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  sparklineData?: { value: number }[];
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  sparklineData,
  trend,
  trendValue,
  className,
}: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-gray-400';
  const sparkColor = trend === 'up' ? 'emerald' : trend === 'down' ? 'rose' : 'blue';

  return (
    <Card
      className={cn(
        'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
        'border-white/[0.08] ring-0',
        className
      )}
    >
      <Text className="text-gray-400">{title}</Text>
      <Flex className="mt-2" justifyContent="between" alignItems="end">
        <div>
          <Metric className="text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Metric>
          {trendValue && (
            <Text className={cn('text-sm mt-1', trendColor)}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {trendValue}
            </Text>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <SparkAreaChart
            data={sparklineData}
            categories={['value']}
            index="index"
            colors={[sparkColor]}
            className="h-10 w-24"
          />
        )}
      </Flex>
    </Card>
  );
}
