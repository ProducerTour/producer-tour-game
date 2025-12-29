/**
 * Nivo Pie/Donut Chart Component
 * Cassette theme with yellow (#f0e226) accents
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
  /** Use light mode colors (for white backgrounds) */
  lightMode?: boolean;
}

// Dark theme colors - cassette yellow with grays
const darkColors = ['#f0e226', '#ffffff', '#888888', '#f0e226aa', '#ffffff99', '#666666', '#f0e22666', '#444444'];
// Light theme colors - blue primary palette
const lightColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

export function NivoPieChart({
  data,
  height = 300,
  innerRadius = 0.5, // Donut by default
  padAngle = 0.7,
  cornerRadius = 4,
  colors,
  enableArcLinkLabels = true,
  enableArcLabels = false,
  margin = { top: 20, right: 80, bottom: 20, left: 80 },
  valueFormat,
  lightMode = false,
}: PieChartProps) {
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Theme colors based on mode
  const themeColors = lightMode ? {
    textFill: '#4B5563',          // gray-600
    arcLinkLabelsText: '#6B7280', // gray-500
    tooltipBg: '#ffffff',
    tooltipText: '#1f2937',
    tooltipBorder: 'rgba(0, 0, 0, 0.1)',
    accentColor: '#3b82f6',       // blue-500
  } : {
    textFill: 'rgba(255, 255, 255, 0.4)',
    arcLinkLabelsText: 'rgba(255, 255, 255, 0.4)',
    tooltipBg: '#19181a',
    tooltipText: '#ffffff',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    accentColor: '#f0e226',       // cassette yellow
  };

  // Use provided colors or default based on mode
  const chartColors = colors || (lightMode ? lightColors : darkColors);

  return (
    <div style={{ height }}>
      <ResponsivePie
        data={data}
        margin={margin}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={8}
        colors={chartColors}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={enableArcLinkLabels}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={themeColors.arcLinkLabelsText}
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: 'color' }}
        enableArcLabels={enableArcLabels}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={lightMode ? '#1f2937' : '#000000'}
        animate={true}
        motionConfig="gentle"
        theme={{
          background: 'transparent',
          text: {
            fontSize: 10,
            fill: themeColors.textFill,
          },
          tooltip: {
            container: {
              background: themeColors.tooltipBg,
              color: themeColors.tooltipText,
              fontSize: 12,
              borderRadius: lightMode ? '8px' : '0px',
              boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
              border: `1px solid ${themeColors.tooltipBorder}`,
            },
          },
        }}
        tooltip={({ datum }) => (
          <div
            style={{
              padding: '12px 16px',
              background: themeColors.tooltipBg,
              border: `1px solid ${themeColors.tooltipBorder}`,
              borderRadius: lightMode ? '8px' : '0px',
              color: themeColors.tooltipText,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: datum.color,
                  borderRadius: lightMode ? '2px' : '0px',
                }}
              />
              <span style={{ fontWeight: 400, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{datum.label}</span>
            </div>
            <div style={{ marginTop: '8px', fontWeight: 300, fontSize: '18px', color: themeColors.accentColor }}>
              {valueFormat ? valueFormat(datum.value) : currencyFormatter(datum.value)}
              <span style={{ marginLeft: '8px', color: themeColors.textFill, fontSize: '11px' }}>
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
            itemTextColor: themeColors.textFill,
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 8,
            symbolShape: 'square',
          },
        ]}
      />
    </div>
  );
}
