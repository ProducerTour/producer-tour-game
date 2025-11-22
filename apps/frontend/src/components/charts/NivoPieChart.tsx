/**
 * Nivo Pie/Donut Chart Component
 * Beautiful animated pie chart with dark theme
 */

import { ResponsivePie } from '@nivo/pie';

interface PieDataItem {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieDataItem[];
  height?: number;
  innerRadius?: number; // 0 = pie, 0.5+ = donut
  padAngle?: number;
  cornerRadius?: number;
  colors?: string[];
  enableArcLinkLabels?: boolean;
  enableArcLabels?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  valueFormat?: (value: number) => string;
}

const defaultColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export function NivoPieChart({
  data,
  height = 300,
  innerRadius = 0.5, // Donut by default
  padAngle = 0.7,
  cornerRadius = 4,
  colors = defaultColors,
  enableArcLinkLabels = true,
  enableArcLabels = false,
  margin = { top: 20, right: 80, bottom: 20, left: 80 },
  valueFormat,
}: PieChartProps) {
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={data}
        margin={margin}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={8}
        colors={colors}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={enableArcLinkLabels}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#9ca3af"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        enableArcLabels={enableArcLabels}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
        animate={true}
        motionConfig="gentle"
        theme={{
          background: 'transparent',
          text: {
            fontSize: 11,
            fill: '#9ca3af',
          },
          tooltip: {
            container: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: 12,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          },
        }}
        tooltip={({ datum }) => (
          <div
            style={{
              padding: '8px 12px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: datum.color,
                }}
              />
              <span style={{ fontWeight: 500 }}>{datum.label}</span>
            </div>
            <div style={{ marginTop: '4px', fontWeight: 600 }}>
              {valueFormat ? valueFormat(datum.value) : currencyFormatter(datum.value)}
              <span style={{ marginLeft: '8px', color: '#9ca3af', fontSize: '11px' }}>
                ({((datum.arc.endAngle - datum.arc.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 8,
            itemWidth: 80,
            itemHeight: 18,
            itemTextColor: '#9ca3af',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
      />
    </div>
  );
}
