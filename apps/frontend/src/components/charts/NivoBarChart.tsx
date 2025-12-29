/**
 * Nivo Bar Chart Component
 * Beautiful animated bar chart with dark theme styling
 */

import { ResponsiveBar } from '@nivo/bar';

interface BarChartProps {
  data: Array<{ [key: string]: string | number }>;
  keys: string[];
  indexBy: string;
  layout?: 'vertical' | 'horizontal';
  groupMode?: 'grouped' | 'stacked';
  valueFormat?: (value: number) => string;
  colors?: string[];
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  enableGridY?: boolean;
  enableLabel?: boolean;
  axisBottom?: boolean | object;
  axisLeft?: boolean | object;
  /** Use light mode colors (for white backgrounds) */
  lightMode?: boolean;
}

// Dark theme color palette
const defaultColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export function NivoBarChart({
  data,
  keys,
  indexBy,
  layout = 'vertical',
  groupMode = 'grouped',
  valueFormat,
  colors = defaultColors,
  height = 300,
  margin = { top: 20, right: 20, bottom: 50, left: 60 },
  enableGridY = true,
  enableLabel = false,
  axisBottom = true,
  axisLeft = true,
  lightMode = false,
}: BarChartProps) {
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Theme colors based on mode
  const themeColors = lightMode ? {
    textFill: '#4B5563',          // gray-600
    gridStroke: 'rgba(0, 0, 0, 0.08)',
    axisStroke: 'rgba(0, 0, 0, 0.15)',
    tooltipBg: '#ffffff',
    tooltipText: '#1f2937',
    tooltipBorder: 'rgba(0, 0, 0, 0.1)',
  } : {
    textFill: '#9ca3af',
    gridStroke: 'rgba(255, 255, 255, 0.06)',
    axisStroke: 'rgba(255, 255, 255, 0.1)',
    tooltipBg: '#1e293b',
    tooltipText: '#f1f5f9',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
  };

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        layout={layout}
        groupMode={groupMode}
        margin={margin}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={colors}
        borderRadius={4}
        borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={
          axisBottom
            ? {
                tickSize: 5,
                tickPadding: 5,
                tickRotation: data.length > 6 ? -45 : 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 40,
                truncateTickAt: 0,
              }
            : null
        }
        axisLeft={
          axisLeft
            ? {
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -50,
                format: valueFormat || currencyFormatter,
              }
            : null
        }
        enableGridY={enableGridY}
        gridYValues={5}
        enableLabel={enableLabel}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
        legends={
          keys.length > 1
            ? [
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 12,
                  symbolShape: 'circle',
                  itemTextColor: themeColors.textFill,
                },
              ]
            : []
        }
        animate={true}
        motionConfig="gentle"
        theme={{
          background: 'transparent',
          text: {
            fontSize: 11,
            fill: themeColors.textFill,
          },
          axis: {
            domain: {
              line: {
                stroke: themeColors.axisStroke,
                strokeWidth: 1,
              },
            },
            ticks: {
              line: {
                stroke: themeColors.axisStroke,
                strokeWidth: 1,
              },
              text: {
                fill: themeColors.textFill,
                fontSize: 11,
              },
            },
          },
          grid: {
            line: {
              stroke: themeColors.gridStroke,
              strokeWidth: 1,
            },
          },
          tooltip: {
            container: {
              background: themeColors.tooltipBg,
              color: themeColors.tooltipText,
              fontSize: 12,
              borderRadius: '8px',
              boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${themeColors.tooltipBorder}`,
            },
          },
        }}
        tooltip={({ id, value, color, indexValue }) => (
          <div
            style={{
              padding: '8px 12px',
              background: themeColors.tooltipBg,
              border: `1px solid ${themeColors.tooltipBorder}`,
              borderRadius: '8px',
              color: themeColors.tooltipText,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: color,
                }}
              />
              <span style={{ color: themeColors.textFill }}>{indexValue}</span>
            </div>
            <div style={{ marginTop: '4px', fontWeight: 600 }}>
              {id}: {valueFormat ? valueFormat(value as number) : currencyFormatter(value as number)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
