/**
 * Stats List Component
 * Tremor-based list for ranked data (top writers, top works, etc.)
 */

import { Card, Title, Text, Flex, BarList, Bold } from '@tremor/react';
import { cn } from '../../lib/utils';

interface ListItem {
  name: string;
  value: number;
  href?: string;
  key?: string;
}

interface StatsListProps {
  title: string;
  subtitle?: string;
  data: ListItem[];
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString();

export function StatsList({
  title,
  subtitle,
  data,
  valueFormatter = defaultFormatter,
  showAnimation = true,
  className,
}: StatsListProps) {
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
      <Flex className="mt-4">
        <Text className="text-gray-400">
          <Bold>Name</Bold>
        </Text>
        <Text className="text-gray-400">
          <Bold>Value</Bold>
        </Text>
      </Flex>
      <BarList
        data={data}
        valueFormatter={valueFormatter}
        showAnimation={showAnimation}
        className="mt-2"
      />
    </Card>
  );
}
