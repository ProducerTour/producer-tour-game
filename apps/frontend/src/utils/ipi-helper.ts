/**
 * IPI Number Display Helper
 *
 * Provides formatting and labeling for known IPI numbers.
 * Producer Tour may have multiple IPI numbers across different PROs.
 */

export const KNOWN_IPI_LABELS: Record<string, string> = {
  '1266292635': 'Producer Tour ASCAP',
  '1263506662': 'Producer Tour BMI',
  // Add more IPI numbers here as needed
};

/**
 * Format an IPI number for display with optional label
 * @param ipiNumber - The IPI/CAE number to format
 * @returns Formatted string like "1266292635 (Producer Tour ASCAP)" or just the number
 */
export function formatIpiDisplay(ipiNumber: string | null | undefined): string {
  if (!ipiNumber) return '-';

  const label = KNOWN_IPI_LABELS[ipiNumber];
  return label ? `${ipiNumber} (${label})` : ipiNumber;
}

/**
 * Get just the label for a known IPI number
 * @param ipiNumber - The IPI/CAE number
 * @returns The label (e.g., "Producer Tour ASCAP") or null if unknown
 */
export function getIpiLabel(ipiNumber: string | null | undefined): string | null {
  if (!ipiNumber) return null;
  return KNOWN_IPI_LABELS[ipiNumber] || null;
}

/**
 * Check if an IPI number belongs to Producer Tour
 * @param ipiNumber - The IPI/CAE number to check
 * @returns True if this is a known Producer Tour IPI
 */
export function isProducerTourIpi(ipiNumber: string | null | undefined): boolean {
  if (!ipiNumber) return false;
  return ipiNumber in KNOWN_IPI_LABELS;
}
