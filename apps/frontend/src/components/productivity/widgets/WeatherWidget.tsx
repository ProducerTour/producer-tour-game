import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind,
  Droplets, Thermometer, Loader2, MapPin, RefreshCw
} from 'lucide-react';
import type { WidgetProps, WeatherConfig } from '../../../types/productivity.types';

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  description: string;
}

/**
 * WeatherWidget - Current weather conditions
 *
 * Features:
 * - Auto-detect location or manual city input
 * - Current temperature and conditions
 * - Weather icons
 * - Humidity and wind speed
 * - Celsius/Fahrenheit toggle
 */
export default function WeatherWidget({ config, onConfigChange, isEditing }: WidgetProps) {
  const weatherConfig = config as WeatherConfig;
  const [location, setLocation] = useState(weatherConfig.location || '');
  const [units, setUnits] = useState<'metric' | 'imperial'>(weatherConfig.units || 'imperial');

  // Get user location on mount
  useEffect(() => {
    if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        },
        () => {
          // Location access denied - use default
          setLocation('New York');
        }
      );
    }
  }, []);

  // Fetch weather data using Open-Meteo (free, no API key required)
  const { data: weather, isLoading, refetch } = useQuery({
    queryKey: ['weather', location, units],
    queryFn: async (): Promise<WeatherData> => {
      if (!location) throw new Error('No location');

      let lat: number, lon: number, locationName: string;

      // Check if location is coordinates
      if (location.includes(',')) {
        const [latStr, lonStr] = location.split(',');
        lat = parseFloat(latStr);
        lon = parseFloat(lonStr);
        locationName = 'Current Location';
      } else {
        // Geocode city name using Open-Meteo's geocoding
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('City not found');
        }

        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
        locationName = geoData.results[0].name;
      }

      // Fetch weather from Open-Meteo
      const tempUnit = units === 'metric' ? 'celsius' : 'fahrenheit';
      const windUnit = units === 'metric' ? 'kmh' : 'mph';

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`
      );
      const weatherData = await weatherResponse.json();

      const current = weatherData.current;
      const weatherCode = current.weather_code;

      // Map weather codes to conditions
      const getCondition = (code: number) => {
        if (code === 0) return { condition: 'Clear', icon: 'sun', description: 'Clear sky' };
        if (code <= 3) return { condition: 'Cloudy', icon: 'cloud', description: 'Partly cloudy' };
        if (code <= 49) return { condition: 'Fog', icon: 'cloud', description: 'Foggy' };
        if (code <= 59) return { condition: 'Drizzle', icon: 'rain', description: 'Drizzle' };
        if (code <= 69) return { condition: 'Rain', icon: 'rain', description: 'Rainy' };
        if (code <= 79) return { condition: 'Snow', icon: 'snow', description: 'Snowy' };
        if (code <= 84) return { condition: 'Rain', icon: 'rain', description: 'Rain showers' };
        if (code <= 86) return { condition: 'Snow', icon: 'snow', description: 'Snow showers' };
        if (code <= 99) return { condition: 'Storm', icon: 'storm', description: 'Thunderstorm' };
        return { condition: 'Unknown', icon: 'cloud', description: 'Unknown' };
      };

      const conditionData = getCondition(weatherCode);

      return {
        location: locationName,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        ...conditionData,
      };
    },
    enabled: !!location,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });

  // Get weather icon component
  const getWeatherIcon = (icon: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      sun: <Sun className="w-12 h-12 text-yellow-400" />,
      cloud: <Cloud className="w-12 h-12 text-gray-400" />,
      rain: <CloudRain className="w-12 h-12 text-blue-400" />,
      snow: <CloudSnow className="w-12 h-12 text-cyan-200" />,
      storm: <CloudLightning className="w-12 h-12 text-purple-400" />,
    };
    return iconMap[icon] || <Cloud className="w-12 h-12 text-gray-400" />;
  };

  // Toggle units
  const toggleUnits = () => {
    const newUnits = units === 'metric' ? 'imperial' : 'metric';
    setUnits(newUnits);
    onConfigChange({ ...config, units: newUnits });
  };

  if (isLoading || !location) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Location Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-theme-foreground-muted" />
          <span className="text-sm text-theme-foreground truncate">
            {weather?.location || location}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isEditing}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-theme-foreground-muted" />
        </button>
      </div>

      {/* Main Weather Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {weather ? (
          <>
            {getWeatherIcon(weather.icon)}

            <div className="flex items-start gap-1 mt-2">
              <span className="text-4xl font-bold text-theme-foreground">
                {weather.temperature}
              </span>
              <button
                onClick={toggleUnits}
                disabled={isEditing}
                className="text-lg text-theme-foreground-muted hover:text-theme-foreground transition-colors"
              >
                °{units === 'metric' ? 'C' : 'F'}
              </button>
            </div>

            <span className="text-sm text-theme-foreground-muted mt-1">
              {weather.description}
            </span>
          </>
        ) : (
          <div className="text-center text-theme-foreground-muted">
            <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Unable to load weather</p>
          </div>
        )}
      </div>

      {/* Weather Details */}
      {weather && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 mt-2">
          <div className="text-center">
            <Thermometer className="w-4 h-4 mx-auto text-orange-400 mb-1" />
            <span className="text-xs text-theme-foreground-muted">Feels like</span>
            <span className="text-sm font-medium text-theme-foreground block">
              {weather.feelsLike}°
            </span>
          </div>
          <div className="text-center">
            <Droplets className="w-4 h-4 mx-auto text-blue-400 mb-1" />
            <span className="text-xs text-theme-foreground-muted">Humidity</span>
            <span className="text-sm font-medium text-theme-foreground block">
              {weather.humidity}%
            </span>
          </div>
          <div className="text-center">
            <Wind className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
            <span className="text-xs text-theme-foreground-muted">Wind</span>
            <span className="text-sm font-medium text-theme-foreground block">
              {weather.windSpeed} {units === 'metric' ? 'km/h' : 'mph'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
