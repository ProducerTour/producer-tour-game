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
}

// Cassette theme colors - yellow primary with complementary colors
const defaultColors = ['#f0e226', '#ffffff', '#888888', '#f0e226aa', '#ffffff99', '#666666', '#f0e22666', '#444444'];

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
        arcLinkLabelsTextColor="rgba(255, 255, 255, 0.4)"
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: 'color' }}
        enableArcLabels={enableArcLabels}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#000000"
        animate={true}
        motionConfig="gentle"
        theme={{
          background: 'transparent',
          text: {
            fontSize: 10,
            fill: 'rgba(255, 255, 255, 0.4)',
          },
          tooltip: {
            container: {
              background: '#19181a',
              color: '#ffffff',
              fontSize: 12,
              borderRadius: '0px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          },
        }}
        tooltip={({ datum }) => (
          <div
            style={{
              padding: '12px 16px',
              background: '#19181a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: datum.color,
                }}
              />
              <span style={{ fontWeight: 400, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{datum.label}</span>
            </div>
            <div style={{ marginTop: '8px', fontWeight: 300, fontSize: '18px', color: '#f0e226' }}>
              {valueFormat ? valueFormat(datum.value) : currencyFormatter(datum.value)}
              <span style={{ marginLeft: '8px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>
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
            itemTextColor: 'rgba(255, 255, 255, 0.4)',
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
