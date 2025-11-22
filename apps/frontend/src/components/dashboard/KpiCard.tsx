/**
 * KPI Card Component
 * Tremor-based stat cards for dashboard metrics
 */

import { Card, Metric, Text, Flex, BadgeDelta, Grid } from '@tremor/react';
import type { DeltaType } from '@tremor/react';
import { cn } from '../../lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  delta?: string;
  deltaType?: DeltaType;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  delta,
  deltaType = 'unchanged',
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
        'border-white/[0.08] ring-0',
        className
      )}
      decoration="top"
      decorationColor={
        deltaType === 'increase' ? 'emerald' :
        deltaType === 'decrease' ? 'rose' : 'blue'
      }
    >
      <Flex alignItems="start">
        <div className="truncate">
          <Text className="text-gray-400">{title}</Text>
          <Metric className="text-white mt-1 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Metric>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
            {icon}
          </div>
        )}
      </Flex>
      {delta && (
        <Flex className="mt-4 space-x-2">
          <BadgeDelta deltaType={deltaType} size="xs">
            {delta}
          </BadgeDelta>
          <Text className="text-gray-500 text-xs">vs last period</Text>
        </Flex>
      )}
    </Card>
  );
}

interface KpiCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KpiCardGrid({ children, columns = 4, className }: KpiCardGridProps) {
  return (
    <Grid numItemsSm={2} numItemsLg={columns} className={cn('gap-6', className)}>
      {children}
    </Grid>
  );
}
