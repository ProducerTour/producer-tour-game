/**
 * Recharts Sparkline Component
 * Minimal area chart for KPI cards - works with both themes
 */

import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { useMemo } from 'react';

export interface SparklineProps {
  /** Data points to display */
  data?: number[];
  /** Color of the line and fill */
  color?: string;
  /** Height of the chart */
  height?: number;
  /** Unique ID for gradient (required if multiple sparklines on same page) */
  gradientId?: string;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Whether to show dots */
  showDots?: boolean;
  /** Generate random-looking but consistent data based on a seed string */
  seed?: string;
}

/**
 * Generate consistent pseudo-random data based on a seed string
 */
function generateSeededData(seed: string, points: number = 12): number[] {
  const data: number[] = [];
  let seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 7;

  for (let i = 0; i < points; i++) {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    // Create trending data that generally goes up
    const baseValue = 30 + (i / points) * 30; // Trend upward
    const variance = (seedNum / 233280) * 40 - 20; // Add some noise
    data.push(Math.max(10, Math.min(90, baseValue + variance)));
  }

  return data;
}

export function Sparkline({
  data,
  color = 'var(--theme-primary)',
  height = 40,
  gradientId,
  fillOpacity = 0.3,
  showDots = false,
  seed,
}: SparklineProps) {
  // Use provided data or generate from seed
  const chartData = useMemo(() => {
    const values = data || (seed ? generateSeededData(seed) : generateSeededData('default'));
    return values.map((value, index) => ({ index, value }));
  }, [data, seed]);

  // Generate unique gradient ID if not provided
  const uniqueGradientId = gradientId || `sparkline-gradient-${seed || 'default'}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
      >
        <defs>
          <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${uniqueGradientId})`}
          dot={showDots ? { r: 2, fill: color } : false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Color presets for different card types
export const SPARKLINE_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  emerald: '#10B981',
  purple: '#8B5CF6',
  orange: '#F97316',
  amber: '#F59E0B',
  red: '#EF4444',
  pink: '#EC4899',
  theme: 'var(--theme-primary)',
} as const;

export type SparklineColorKey = keyof typeof SPARKLINE_COLORS;

export default Sparkline;
