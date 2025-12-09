/**
 * Placement Matcher Service
 *
 * Matches statement songs to Placement Tracker entries by title.
 * Used to look up split percentages for statement processing.
 */

import { prisma } from '../lib/prisma';
import { Placement, PlacementCredit, User, Producer } from '../generated/client';

// Type for PlacementCredit with included relations
export interface PlacementCreditWithUser extends PlacementCredit {
  user: (User & { producer: Producer | null }) | null;
}

// Type for Placement with credits
export interface PlacementWithCredits extends Placement {
  credits: PlacementCreditWithUser[];
}

export interface PlacementMatch {
  placement: PlacementWithCredits;
  confidence: number;
  matchedBy: 'exact_title' | 'fuzzy_title';
}

/**
 * Normalize song title for matching
 * Removes special characters, extra spaces, and converts to lowercase
 */
export function normalizeSongTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Collapse multiple spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage (0-1) based on Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return 1 - (distance / maxLength);
}

// Cache for placements to avoid repeated DB queries during batch processing
let placementCache: PlacementWithCredits[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get all approved/tracking placements with credits
 * Uses caching for batch operations
 */
async function getAllPlacements(forceRefresh = false): Promise<PlacementWithCredits[]> {
  const now = Date.now();

  if (!forceRefresh && placementCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return placementCache;
  }

  try {
    placementCache = await prisma.placement.findMany({
      where: {
        status: { in: ['APPROVED', 'TRACKING'] }
      },
      include: {
        credits: {
          include: {
            user: {
              include: {
                producer: true
              }
            }
          }
        }
      }
    }) as PlacementWithCredits[];

    cacheTimestamp = now;
    console.log(`Loaded ${placementCache.length} placements from database`);
    return placementCache;
  } catch (error) {
    console.error('Error fetching placements:', error);
    // Return empty array on error to prevent cascading failures
    return [];
  }
}

/**
 * Clear the placement cache (call when placements are modified)
 */
export function clearPlacementCache(): void {
  placementCache = null;
  cacheTimestamp = 0;
}

/**
 * Match a song title to a Placement in the tracker
 *
 * @param songTitle - The song title from the statement
 * @param minConfidence - Minimum confidence threshold (default 0.85 = 85%)
 * @returns PlacementMatch if found, null otherwise
 */
export async function matchSongToPlacement(
  songTitle: string,
  minConfidence: number = 0.85
): Promise<PlacementMatch | null> {
  const normalized = normalizeSongTitle(songTitle);

  if (!normalized) return null;

  const placements = await getAllPlacements();

  // Strategy 1: Exact match (normalized)
  const exactMatch = placements.find(p =>
    normalizeSongTitle(p.title) === normalized
  );

  if (exactMatch) {
    return {
      placement: exactMatch,
      confidence: 100,
      matchedBy: 'exact_title'
    };
  }

  // Strategy 2: Fuzzy match
  let bestMatch: PlacementWithCredits | null = null;
  let bestScore = 0;

  for (const placement of placements) {
    const placementNormalized = normalizeSongTitle(placement.title);
    const similarity = stringSimilarity(normalized, placementNormalized);

    if (similarity > bestScore && similarity >= minConfidence) {
      bestScore = similarity;
      bestMatch = placement;
    }
  }

  if (bestMatch) {
    return {
      placement: bestMatch,
      confidence: Math.round(bestScore * 100),
      matchedBy: 'fuzzy_title'
    };
  }

  return null;
}

/**
 * Batch match multiple songs to placements
 * More efficient for processing entire statements
 *
 * @param songTitles - Array of song titles to match
 * @param minConfidence - Minimum confidence threshold
 * @returns Map of songTitle -> PlacementMatch
 */
export async function batchMatchSongsToPlacement(
  songTitles: string[],
  minConfidence: number = 0.85
): Promise<Map<string, PlacementMatch | null>> {
  // Force cache refresh for batch operations
  await getAllPlacements(true);

  const results = new Map<string, PlacementMatch | null>();

  for (const title of songTitles) {
    const match = await matchSongToPlacement(title, minConfidence);
    results.set(title, match);
  }

  return results;
}

/**
 * Get PT's publisher IPIs for filtering PT-represented writers
 */
export async function getPtPublisherIpis(): Promise<string[]> {
  try {
    const ptPublishers = await prisma.producerTourPublisher.findMany({
      where: { isActive: true },
      select: { ipiNumber: true }
    });

    const ipis = ptPublishers.map(p => p.ipiNumber);
    console.log(`Found ${ipis.length} PT publisher IPIs`);
    return ipis;
  } catch (error) {
    console.error('Error fetching PT publisher IPIs:', error);
    return [];
  }
}

/**
 * Check if a writer is PT-represented based on their publisher IPI
 */
export function isPtRepresentedWriter(
  publisherIpiNumber: string | null,
  ptPublisherIpis: string[]
): boolean {
  if (!publisherIpiNumber) return false;

  // Normalize IPI for comparison
  const normalizedIpi = publisherIpiNumber.replace(/[\s\-\.]/g, '').replace(/^0+/, '');

  return ptPublisherIpis.some(ptIpi => {
    const normalizedPtIpi = ptIpi.replace(/[\s\-\.]/g, '').replace(/^0+/, '');
    return normalizedIpi === normalizedPtIpi;
  });
}
