/**
 * Nivo Line/Area Chart Component
 * Smooth animated line chart with gradient fill
 */

import { ResponsiveLine } from '@nivo/line';

// Define Serie type locally since it's not exported from newer @nivo/line versions
interface Serie {
  id: string | number;
  data: Array<{
    x: string | number | Date;
    y: string | number | Date | null;
  }>;
  [key: string]: unknown;
}

interface LineChartProps {
  data: Serie[];
  height?: number;
  enableArea?: boolean;
  areaOpacity?: number;
  curve?: 'linear' | 'monotoneX' | 'natural' | 'step';
  colors?: string[];
  enablePoints?: boolean;
  pointSize?: number;
  enableGridX?: boolean;
  enableGridY?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
  valueFormat?: (value: number) => string;
  axisBottom?: boolean | object;
  axisLeft?: boolean | object;
}

const defaultColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export function NivoLineChart({
  data,
  height = 300,
  enableArea = true,
  areaOpacity = 0.15,
  curve = 'monotoneX',
  colors = defaultColors,
  enablePoints = true,
  pointSize = 8,
  enableGridX = false,
  enableGridY = true,
  margin = { top: 20, right: 20, bottom: 50, left: 60 },
  valueFormat,
  axisBottom = true,
  axisLeft = true,
}: LineChartProps) {
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={data}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
        curve={curve}
        colors={colors}
        lineWidth={2}
        enableArea={enableArea}
        areaOpacity={areaOpacity}
        areaBlendMode="normal"
        enablePoints={enablePoints}
        pointSize={pointSize}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        axisTop={null}
        axisRight={null}
        axisBottom={
          axisBottom
            ? {
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendOffset: 36,
                legendPosition: 'middle',
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
                legendOffset: -50,
                legendPosition: 'middle',
                format: valueFormat || currencyFormatter,
              }
            : null
        }
        useMesh={true}
        animate={true}
        motionConfig="gentle"
        theme={{
          background: 'transparent',
          text: {
            fontSize: 11,
            fill: '#9ca3af',
          },
          axis: {
            domain: {
              line: {
                stroke: 'rgba(255, 255, 255, 0.1)',
                strokeWidth: 1,
              },
            },
            ticks: {
              line: {
                stroke: 'rgba(255, 255, 255, 0.1)',
                strokeWidth: 1,
              },
              text: {
                fill: '#9ca3af',
                fontSize: 11,
              },
            },
          },
          grid: {
            line: {
              stroke: 'rgba(255, 255, 255, 0.06)',
              strokeWidth: 1,
            },
          },
          crosshair: {
            line: {
              stroke: 'rgba(255, 255, 255, 0.3)',
              strokeWidth: 1,
              strokeDasharray: '6 6',
            },
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
        tooltip={({ point }) => (
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
                  background: point.seriesColor,
                }}
              />
              <span style={{ color: '#9ca3af' }}>{point.data.xFormatted}</span>
            </div>
            <div style={{ marginTop: '4px', fontWeight: 600 }}>
              {valueFormat
                ? valueFormat(point.data.y as number)
                : currencyFormatter(point.data.y as number)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
