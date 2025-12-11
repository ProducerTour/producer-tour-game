import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear, scaleLog, scaleSqrt } from 'd3-scale';
import { aggregateTerritoryData } from '../utils/territory-mapper';

// Using Natural Earth data with ISO codes - better for territory matching
const geoUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

type ScaleType = 'linear' | 'log' | 'sqrt';

interface TerritoryHeatmapProps {
  territories: Array<{
    territory: string;
    revenue: number;
    count: number;
  }>;
  isAdmin?: boolean;
}

// Gradient colors that work on both light and dark themes
const GRADIENT_COLORS = {
  low: '#3b82f6',      // Blue
  mid: '#8b5cf6',      // Purple
  high: '#ec4899',     // Pink
  max: '#f97316',      // Orange
};

export const TerritoryHeatmap: React.FC<TerritoryHeatmapProps> = ({
  territories,
}) => {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scaleType, setScaleType] = useState<ScaleType>('sqrt');
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Detect theme from document
  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement;
      const theme = html.getAttribute('data-theme') || '';
      // Light themes: default, light, minimal
      // Dark themes: cassette, dark, etc.
      const lightThemes = ['default', 'light', 'minimal'];
      setIsDarkTheme(!lightThemes.includes(theme));
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Theme-aware colors - using explicit hex values for SVG compatibility
  const themeColors = useMemo(() => ({
    empty: isDarkTheme ? '#1e293b' : '#e2e8f0',        // slate-800 / slate-200
    stroke: isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    emptyHover: isDarkTheme ? '#334155' : '#cbd5e1',   // slate-700 / slate-300
    highlight: '#facc15',                               // yellow-400 (works on both)
    // UI overlay colors
    cardBg: isDarkTheme ? '#1A1A1C' : '#ffffff',       // dark gray / white
    cardBorder: isDarkTheme ? '#2A2A2E' : '#e2e8f0',   // lighter dark gray / slate-200
    text: isDarkTheme ? '#f1f5f9' : '#1e293b',         // slate-100 / slate-800
    textMuted: isDarkTheme ? '#94a3b8' : '#64748b',    // slate-400 / slate-500
    buttonActive: isDarkTheme ? '#3b82f6' : '#2563eb', // blue-500 / blue-600
    buttonActiveFg: '#ffffff',                          // white
  }), [isDarkTheme]);

  // Aggregate territory data into country codes
  const countryData = useMemo(() => {
    const aggregated = aggregateTerritoryData(territories);
    const result: Record<string, { revenue: number; count: number; name: string }> = {};
    aggregated.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [territories]);

  // Calculate min and max revenue (excluding zeros for log scale)
  const { minRevenue, maxRevenue } = useMemo(() => {
    const revenues = Object.values(countryData).map(d => d.revenue).filter(r => r > 0);
    return {
      minRevenue: Math.min(...revenues, 1),
      maxRevenue: Math.max(...revenues, 1)
    };
  }, [countryData]);

  // Create color scale based on selected type
  const colorScale = useMemo(() => {
    const colorRange = [GRADIENT_COLORS.low, GRADIENT_COLORS.mid, GRADIENT_COLORS.high, GRADIENT_COLORS.max];

    // Ensure we have a valid domain for log scale
    const safeMin = Math.max(minRevenue, 0.01);
    const safeMax = Math.max(maxRevenue, safeMin * 10);

    switch (scaleType) {
      case 'log':
        return scaleLog<string>()
          .domain([safeMin, safeMax ** 0.33, safeMax ** 0.67, safeMax])
          .range(colorRange)
          .clamp(true);
      case 'sqrt':
        return scaleSqrt<string>()
          .domain([0, safeMax * 0.25, safeMax * 0.5, safeMax])
          .range(colorRange);
      case 'linear':
      default:
        return scaleLinear<string>()
          .domain([0, safeMax * 0.33, safeMax * 0.67, safeMax])
          .range(colorRange);
    }
  }, [scaleType, minRevenue, maxRevenue]);

  // Generate gradient stops for the legend
  const gradientStops = useMemo(() => {
    const stops = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let value: number;

      switch (scaleType) {
        case 'log':
          value = Math.exp(Math.log(Math.max(minRevenue, 0.01)) + t * (Math.log(maxRevenue) - Math.log(Math.max(minRevenue, 0.01))));
          break;
        case 'sqrt':
          value = (t * Math.sqrt(maxRevenue)) ** 2;
          break;
        default:
          value = t * maxRevenue;
      }

      stops.push({
        offset: `${t * 100}%`,
        color: colorScale(Math.max(value, 0.01))
      });
    }
    return stops;
  }, [scaleType, minRevenue, maxRevenue, colorScale]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyFull = (value: number): string => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get fill color for a country
  const getFillColor = (countryCode: string): string => {
    const data = countryData[countryCode];
    if (!data || data.revenue === 0) {
      return themeColors.empty;
    }
    return colorScale(Math.max(data.revenue, 0.01));
  };

  return (
    <div className="relative w-full h-full">
      {/* Scale Type Selector */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-1 backdrop-blur-sm px-2 py-1.5 rounded-lg shadow-lg"
        style={{
          backgroundColor: themeColors.cardBg,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: themeColors.cardBorder
        }}
      >
        <span
          className="text-[10px] mr-1 uppercase tracking-wide"
          style={{ color: themeColors.textMuted }}
        >
          Scale:
        </span>
        {(['linear', 'sqrt', 'log'] as ScaleType[]).map((type) => (
          <button
            key={type}
            onClick={() => setScaleType(type)}
            className="px-2 py-1 text-[10px] font-medium rounded transition-colors"
            style={{
              backgroundColor: scaleType === type ? themeColors.buttonActive : 'transparent',
              color: scaleType === type ? themeColors.buttonActiveFg : themeColors.textMuted,
            }}
          >
            {type === 'sqrt' ? '√' : type === 'log' ? 'log' : 'lin'}
          </button>
        ))}
      </div>

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
                const fillColor = getFillColor(countryCode);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={themeColors.stroke}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        fill: data ? themeColors.highlight : themeColors.emptyHover,
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
                          `${data.name}\nRevenue: ${formatCurrencyFull(data.revenue)}\nItems: ${data.count.toLocaleString()}`
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
          className="fixed z-50 pointer-events-none text-sm px-3 py-2 rounded-lg shadow-lg"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 80}px`,
            transform: 'translateX(-50%)',
            whiteSpace: 'pre-line',
            backgroundColor: themeColors.cardBg,
            color: themeColors.text,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: themeColors.cardBorder
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Gradient Legend */}
      <div
        className="absolute bottom-4 left-4 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg"
        style={{
          backgroundColor: themeColors.cardBg,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: themeColors.cardBorder
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-xs" style={{ color: themeColors.text }}>Revenue</span>
          <span className="text-[10px] capitalize" style={{ color: themeColors.textMuted }}>{scaleType} scale</span>
        </div>

        {/* Gradient Bar */}
        <div
          className="relative h-3 w-40 rounded-full overflow-hidden mb-2"
          style={{ borderWidth: 1, borderStyle: 'solid', borderColor: themeColors.cardBorder }}
        >
          <svg width="100%" height="100%">
            <defs>
              <linearGradient id="heatmapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {gradientStops.map((stop, i) => (
                  <stop key={i} offset={stop.offset} stopColor={stop.color} />
                ))}
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#heatmapGradient)" />
          </svg>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between text-[10px]" style={{ color: themeColors.textMuted }}>
          <span>$0</span>
          <span>{formatCurrency(maxRevenue * 0.5)}</span>
          <span>{formatCurrency(maxRevenue)}</span>
        </div>

        {/* No Data Indicator */}
        <div
          className="flex items-center gap-2 mt-2 pt-2"
          style={{ borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: themeColors.cardBorder }}
        >
          <div
            className="w-4 h-3 rounded"
            style={{
              backgroundColor: themeColors.empty,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: themeColors.cardBorder
            }}
          />
          <span className="text-[10px]" style={{ color: themeColors.textMuted }}>No data</span>
        </div>
      </div>
    </div>
  );
};
