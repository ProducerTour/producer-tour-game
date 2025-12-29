/**
 * Territory to ISO Country Code Mapper
 *
 * Maps various territory name formats to ISO 3166-1 alpha-2 country codes
 * for use with react-simple-maps world heatmap visualization.
 */

// Comprehensive mapping of territory names to ISO codes
const TERRITORY_MAP: Record<string, string> = {
  // United States variations
  'UNITED STATES': 'US',
  'USA': 'US',
  'US': 'US',
  'U.S.': 'US',
  'U.S.A.': 'US',
  'AMERICA': 'US',

  // United Kingdom variations
  'UNITED KINGDOM': 'GB',
  'UK': 'GB',
  'U.K.': 'GB',
  'GREAT BRITAIN': 'GB',
  'BRITAIN': 'GB',
  'ENGLAND': 'GB',

  // Canada
  'CANADA': 'CA',
  'CAN': 'CA',

  // Australia
  'AUSTRALIA': 'AU',
  'AUS': 'AU',

  // Germany
  'GERMANY': 'DE',
  'DEUTSCHLAND': 'DE',
  'GER': 'DE',

  // France
  'FRANCE': 'FR',
  'FRA': 'FR',

  // Italy
  'ITALY': 'IT',
  'ITA': 'IT',

  // Spain
  'SPAIN': 'ES',
  'ESP': 'ES',
  'ESPANA': 'ES',

  // Japan
  'JAPAN': 'JP',
  'JPN': 'JP',

  // China
  'CHINA': 'CN',
  'CHN': 'CN',
  'PRC': 'CN',
  'PEOPLE\'S REPUBLIC OF CHINA': 'CN',

  // Brazil
  'BRAZIL': 'BR',
  'BRASIL': 'BR',
  'BRA': 'BR',

  // Mexico
  'MEXICO': 'MX',
  'MEX': 'MX',

  // India
  'INDIA': 'IN',
  'IND': 'IN',

  // South Korea
  'SOUTH KOREA': 'KR',
  'KOREA': 'KR',
  'KOR': 'KR',
  'REPUBLIC OF KOREA': 'KR',

  // Netherlands
  'NETHERLANDS': 'NL',
  'HOLLAND': 'NL',
  'NLD': 'NL',

  // Belgium
  'BELGIUM': 'BE',
  'BEL': 'BE',

  // Switzerland
  'SWITZERLAND': 'CH',
  'SWI': 'CH',

  // Sweden
  'SWEDEN': 'SE',
  'SWE': 'SE',

  // Norway
  'NORWAY': 'NO',
  'NOR': 'NO',

  // Denmark
  'DENMARK': 'DK',
  'DNK': 'DK',

  // Finland
  'FINLAND': 'FI',
  'FIN': 'FI',

  // Poland
  'POLAND': 'PL',
  'POL': 'PL',

  // Russia
  'RUSSIA': 'RU',
  'RUSSIAN FEDERATION': 'RU',
  'RUS': 'RU',

  // Argentina
  'ARGENTINA': 'AR',
  'ARG': 'AR',

  // Chile
  'CHILE': 'CL',
  'CHL': 'CL',

  // Colombia
  'COLOMBIA': 'CO',
  'COL': 'CO',

  // Peru
  'PERU': 'PE',
  'PER': 'PE',

  // Venezuela
  'VENEZUELA': 'VE',
  'VEN': 'VE',

  // South Africa
  'SOUTH AFRICA': 'ZA',
  'RSA': 'ZA',
  'ZAF': 'ZA',

  // New Zealand
  'NEW ZEALAND': 'NZ',
  'NZL': 'NZ',

  // Ireland
  'IRELAND': 'IE',
  'IRL': 'IE',

  // Portugal
  'PORTUGAL': 'PT',
  'PRT': 'PT',

  // Greece
  'GREECE': 'GR',
  'GRC': 'GR',

  // Turkey
  'TURKEY': 'TR',
  'TUR': 'TR',

  // Austria
  'AUSTRIA': 'AT',
  'AUT': 'AT',

  // Czech Republic
  'CZECH REPUBLIC': 'CZ',
  'CZECHIA': 'CZ',
  'CZE': 'CZ',

  // Hungary
  'HUNGARY': 'HU',
  'HUN': 'HU',

  // Romania
  'ROMANIA': 'RO',
  'ROU': 'RO',

  // Israel
  'ISRAEL': 'IL',
  'ISR': 'IL',

  // UAE
  'UNITED ARAB EMIRATES': 'AE',
  'UAE': 'AE',
  'U.A.E.': 'AE',

  // Saudi Arabia
  'SAUDI ARABIA': 'SA',
  'SAU': 'SA',

  // Singapore
  'SINGAPORE': 'SG',
  'SGP': 'SG',

  // Thailand
  'THAILAND': 'TH',
  'THA': 'TH',

  // Malaysia
  'MALAYSIA': 'MY',
  'MYS': 'MY',

  // Indonesia
  'INDONESIA': 'ID',
  'IDN': 'ID',

  // Philippines
  'PHILIPPINES': 'PH',
  'PHL': 'PH',

  // Vietnam
  'VIETNAM': 'VN',
  'VNM': 'VN',

  // Egypt
  'EGYPT': 'EG',
  'EGY': 'EG',

  // Nigeria
  'NIGERIA': 'NG',
  'NGA': 'NG',

  // Kenya
  'KENYA': 'KE',
  'KEN': 'KE',

  // Ghana
  'GHANA': 'GH',
  'GHA': 'GH',
};

/**
 * Normalize territory name and map to ISO country code
 * @param territory - Raw territory name from statement data
 * @returns ISO 3166-1 alpha-2 country code or null if not found
 */
export function mapTerritoryToCountryCode(territory: string | null | undefined): string | null {
  if (!territory || typeof territory !== 'string') {
    return null;
  }

  // Normalize: trim, uppercase, remove extra spaces
  const normalized = territory.trim().toUpperCase().replace(/\s+/g, ' ');

  // Direct lookup
  if (TERRITORY_MAP[normalized]) {
    return TERRITORY_MAP[normalized];
  }

  // Check if it's already a 2-letter ISO code
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Partial matching for common patterns
  if (normalized.includes('STATES')) return 'US';
  if (normalized.includes('KINGDOM')) return 'GB';

  return null;
}

/**
 * Aggregate territory revenue data into country codes
 * @param territories - Array of territory revenue data
 * @returns Map of country codes to aggregated revenue
 */
export function aggregateTerritoryData(territories: Array<{
  territory: string;
  revenue: number;
  count: number;
}>): Map<string, { revenue: number; count: number; name: string }> {
  const countryMap = new Map<string, { revenue: number; count: number; name: string }>();

  territories.forEach(({ territory, revenue, count }) => {
    const countryCode = mapTerritoryToCountryCode(territory);

    if (countryCode) {
      const existing = countryMap.get(countryCode);
      if (existing) {
        existing.revenue += revenue;
        existing.count += count;
      } else {
        countryMap.set(countryCode, {
          revenue,
          count,
          name: territory // Keep original name for display
        });
      }
    }
  });

  return countryMap;
}
