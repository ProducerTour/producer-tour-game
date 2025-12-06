import React, { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { aggregateTerritoryData } from '../utils/territory-mapper';

// Using Natural Earth data with ISO codes - better for territory matching
const geoUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

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
      .range(['#e2e8f0', '#3b82f6', '#10b981', '#22c55e']);
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
                // Use ISO_A2 from properties instead of numeric id
                const countryCode = geo.properties?.ISO_A2 || geo.properties?.iso_a2 || geo.id;
                const data = countryData[countryCode];
                const fillColor = data ? colorScale(data.revenue) : '#e2e8f0';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#cbd5e1"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        fill: data ? '#facc15' : '#d1d5db',
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
          className="fixed z-50 pointer-events-none bg-white text-gray-900 text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-200"
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
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl text-xs text-gray-600 border border-gray-200 shadow-sm">
        <div className="font-semibold text-gray-900 mb-2">Revenue Scale</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-4 rounded border border-gray-200" style={{ backgroundColor: '#e2e8f0' }}></div>
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
