import React, { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { aggregateTerritoryData } from '../utils/territory-mapper';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface TerritoryHeatmapProps {
  territories: Array<{
    territory: string;
    revenue: number;
    count: number;
  }>;
  isAdmin?: boolean;
}

export const TerritoryHeatmap: React.FC<TerritoryHeatmapProps> = ({
  territories,
}) => {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Aggregate territory data into country codes
  const countryData = useMemo(() => {
    const aggregated = aggregateTerritoryData(territories);
    const result: Record<string, { revenue: number; count: number; name: string }> = {};
    aggregated.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [territories]);

  // Calculate color scale based on revenue
  const maxRevenue = useMemo(() => {
    return Math.max(...Object.values(countryData).map(d => d.revenue), 1);
  }, [countryData]);

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, maxRevenue * 0.3, maxRevenue * 0.6, maxRevenue])
      .range(['#1e293b', '#3b82f6', '#10b981', '#22c55e']);
  }, [maxRevenue]);

  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 147
        }}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }: any) =>
              geographies.map((geo: any) => {
                const countryCode = geo.id;
                const data = countryData[countryCode];
                const fillColor = data ? colorScale(data.revenue) : '#334155';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#1e293b"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        fill: data ? '#facc15' : '#475569',
                        outline: 'none',
                        cursor: data ? 'pointer' : 'default'
                      },
                      pressed: { outline: 'none' }
                    }}
                    onMouseEnter={(e: any) => {
                      if (data) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                        setTooltipContent(
                          `${data.name}\nRevenue: ${formatCurrency(data.revenue)}\nItems: ${data.count}`
                        );
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltipContent('');
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-slate-600"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 80}px`,
            transform: 'translateX(-50%)',
            whiteSpace: 'pre-line'
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 px-4 py-3 rounded-lg text-xs text-gray-300 border border-slate-700">
        <div className="font-semibold text-white mb-2">Revenue Scale</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: '#1e293b' }}></div>
          <span>$0</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>{formatCurrency(maxRevenue * 0.3)}</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span>{formatCurrency(maxRevenue * 0.6)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
          <span>{formatCurrency(maxRevenue)}</span>
        </div>
      </div>
    </div>
  );
};
