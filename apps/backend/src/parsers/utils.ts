/**
 * Parse amount value from string - handles currency formatting
 * Ported from PHP: parse_amount_value()
 */
export function parseAmountValue(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Remove currency symbols, commas, spaces
  let cleaned = String(value).replace(/[$,\s]/g, '');

  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Find header column index by matching keywords
 * Ported from PHP: find_header_index_by_keywords()
 */
export function findHeaderIndexByKeywords(
  header: string[],
  keywords: string[]
): number {
  for (let i = 0; i < header.length; i++) {
    const headerLower = header[i].toLowerCase().trim();
    for (const keyword of keywords) {
      if (headerLower.includes(keyword.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Normalize song title for matching
 */
export function normalizeSongTitle(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Extract integer value from string
 */
export function parseIntValue(value: string | number): number {
  if (typeof value === 'number') return Math.floor(value);
  if (!value) return 0;

  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate CSV header has required columns
 */
export function validateHeader(
  header: string[],
  requiredKeywords: string[][]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const keywords of requiredKeywords) {
    const index = findHeaderIndexByKeywords(header, keywords);
    if (index === -1) {
      missing.push(keywords.join(' or '));
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
