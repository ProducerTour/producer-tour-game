/**
 * Split Calculator Service
 *
 * Calculates writer revenue shares based on Placement Tracker splits.
 * Handles PRO filtering (BMI, ASCAP) and PT representation filtering.
 *
 * MLC-SPECIFIC LOGIC:
 * - Lines with Producer Tour Publisher IPI → Split among writers WITHOUT original publishers
 * - Lines with external publisher IPI → Assign to writer whose publisher matches
 *
 * Precision: Uses 6 decimal places internally, following industry standards (ASCAP, BMI, MLC).
 */

import { PlacementCreditWithUser, isPtRepresentedWriter } from './placement-matcher';
import Decimal from 'decimal.js';

/**
 * Normalize IPI number for comparison
 * Removes spaces, dashes, dots, and leading zeros
 */
function normalizeIPI(ipi: string): string {
  return ipi
    .replace(/[\s\-\.]/g, '') // Remove spaces, dashes, dots
    .replace(/^0+/, '');       // Remove leading zeros
}

// Configure Decimal.js for high precision - no rounding during calculations
Decimal.set({ precision: 20 });

export interface WriterShare {
  userId: string;
  creditId: string;
  firstName: string;
  lastName: string;
  email: string;
  writerIpiNumber: string | null;
  publisherIpiNumber: string | null;
  proAffiliation: string | null;
  originalSplitPercent: number;    // From PlacementCredit (e.g., 16.67%)
  relativeSplitPercent: number;    // Relative to eligible writers' share (e.g., 33.34%)
  revenueAmount: number;           // Actual dollar amount (6 decimal precision)
}

export interface SplitCalculationFilters {
  proAffiliation?: 'BMI' | 'ASCAP' | 'SESAC' | 'GMR' | null;  // Filter by PRO (for BMI/ASCAP statements)
  ptPublisherIpis: string[];                                    // PT's publisher IPIs
  includeOnlyPtWriters: boolean;                               // Only PT-represented writers
}

export interface SplitCalculationResult {
  shares: WriterShare[];
  totalEligibleSplitPercent: number;     // Total % of eligible writers
  totalDistributedRevenue: number;        // Total revenue distributed
  excludedCredits: ExcludedCredit[];      // Credits that didn't match filters
}

export interface ExcludedCredit {
  creditId: string;
  firstName: string;
  lastName: string;
  reason: string;
}

/**
 * Calculate writer shares from PlacementCredit splits
 *
 * This is the core calculation function that:
 * 1. Filters credits based on PRO affiliation and PT representation
 * 2. Calculates relative percentages among eligible writers
 * 3. Distributes revenue proportionally with 6 decimal precision
 *
 * @param lineRevenue - The revenue amount from the statement line
 * @param placementCredits - Array of PlacementCredit records with user relations
 * @param filters - Filtering criteria for PRO and PT representation
 * @returns Calculated shares for each eligible writer
 */
export function calculateWriterShares(
  lineRevenue: number,
  placementCredits: PlacementCreditWithUser[],
  filters: SplitCalculationFilters
): SplitCalculationResult {
  const eligibleCredits: PlacementCreditWithUser[] = [];
  const excludedCredits: ExcludedCredit[] = [];

  // FILTERING LOGIC for BMI/ASCAP statements:
  // 1. Must have split percentage
  // 2. Must be PT-represented writer (userId linked, not external)
  // 3. PRO must match statement type (BMI writers for BMI statements, etc.)
  //
  // KEY INSIGHT: Each BMI/ASCAP statement line is for ONE writer.
  // We split the line ONLY among PT-represented writers on that song.
  // If Kiyan is the only PT writer on "Prayer" → he gets 100% of that line.

  for (const credit of placementCredits) {
    // Safety check for null/undefined credit
    if (!credit || !credit.id) {
      console.warn('Skipping invalid credit:', credit);
      continue;
    }

    // Filter 1: Must have split percentage (KEEP)
    if (credit.splitPercentage === null || credit.splitPercentage === undefined || Number(credit.splitPercentage) <= 0) {
      excludedCredits.push({
        creditId: credit.id,
        firstName: credit.firstName || 'Unknown',
        lastName: credit.lastName || '',
        reason: 'Missing or zero split percentage'
      });
      continue;
    }

    // Filter 2: Must be a PT-represented writer (not external collaborator)
    // PT writers are identified by having a userId linked OR isExternalWriter === false
    // External collaborators should NOT receive royalties - only PT writers
    if (filters.includeOnlyPtWriters) {
      const isPtWriter = credit.userId && !credit.isExternalWriter;

      if (!isPtWriter) {
        excludedCredits.push({
          creditId: credit.id,
          firstName: credit.firstName,
          lastName: credit.lastName,
          reason: 'External writer (not PT-represented)'
        });
        continue;
      }
    }

    // Filter 3: PRO must match statement type (for BMI/ASCAP statements)
    // Priority: credit.pro → user.writerProAffiliation → user.producer.proAffiliation
    if (filters.proAffiliation) {
      const writerPro = credit.pro ||
                       credit.user?.writerProAffiliation ||
                       credit.user?.producer?.proAffiliation;

      if (writerPro !== filters.proAffiliation) {
        excludedCredits.push({
          creditId: credit.id,
          firstName: credit.firstName,
          lastName: credit.lastName,
          reason: `PRO: ${writerPro || 'none'} ≠ ${filters.proAffiliation}`
        });
        continue;
      }
    }

    eligibleCredits.push(credit);
  }

  // If no eligible credits, return empty result with diagnostic info
  if (eligibleCredits.length === 0) {
    // Log detailed exclusion breakdown for debugging
    if (excludedCredits.length > 0) {
      const reasons = excludedCredits.reduce((acc, c) => {
        const key = c.reason.split(':')[0]; // Group by reason type
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`[SplitCalculator] All ${excludedCredits.length} credits excluded:`, reasons);
    }
    return {
      shares: [],
      totalEligibleSplitPercent: 0,
      totalDistributedRevenue: 0,
      excludedCredits
    };
  }

  // Calculate total of eligible splits using Decimal for precision
  const totalEligibleSplit = eligibleCredits.reduce(
    (sum, c) => sum.plus(new Decimal(c.splitPercentage.toString())),
    new Decimal(0)
  );

  // Calculate relative percentages and revenue amounts
  const lineRevenueDecimal = new Decimal(lineRevenue);
  const shares: WriterShare[] = [];
  let totalDistributed = new Decimal(0);

  for (const credit of eligibleCredits) {
    const originalSplit = new Decimal(credit.splitPercentage.toString());

    // Relative split = (writer's split / total eligible split) * 100
    const relativeSplit = originalSplit.div(totalEligibleSplit).times(100);

    // Revenue = lineRevenue * (relativeSplit / 100)
    const revenue = lineRevenueDecimal.times(relativeSplit).div(100);

    totalDistributed = totalDistributed.plus(revenue);

    shares.push({
      userId: credit.userId || '',  // May be empty for unlinked credits
      creditId: credit.id,
      firstName: credit.firstName,
      lastName: credit.lastName,
      email: credit.user?.email || '',  // Safe access for unlinked credits
      writerIpiNumber: credit.ipiNumber || credit.user?.writerIpiNumber || null,
      publisherIpiNumber: credit.publisherIpiNumber || credit.user?.publisherIpiNumber || null,
      proAffiliation: credit.pro || credit.user?.writerProAffiliation || credit.user?.producer?.proAffiliation || null,
      originalSplitPercent: originalSplit.toNumber(),
      relativeSplitPercent: relativeSplit.toNumber(),  // Full precision, no rounding
      revenueAmount: revenue.toNumber()                // Full precision, no rounding
    });
  }

  return {
    shares,
    totalEligibleSplitPercent: totalEligibleSplit.toNumber(),  // Full precision, no rounding
    totalDistributedRevenue: totalDistributed.toNumber(),      // Full precision, no rounding
    excludedCredits
  };
}

/**
 * Calculate shares for MLC statement processing
 *
 * MLC-SPECIFIC LOGIC:
 * - If line has Producer Tour Publisher IPI → Split among writers WITHOUT original publishers
 *   (Writers who use PT as their publisher get this line split proportionally)
 * - If line has external publisher IPI → That writer gets 100% (they have their own publisher)
 *
 * Example: EUTHANIZED with Jackson (16.67%, no publisher), Jalan (16.67%, no publisher), Nathaniel (16.67%, has publisher)
 * - Line with PT Publisher IPI ($1.00): Jackson gets $0.50, Jalan gets $0.50, Nathaniel gets $0 (he gets his through his publisher)
 * - The 16.67% + 16.67% = 33.34% total → each gets 50% relative split
 *
 * @param lineRevenue - The full distributed amount from MLC
 * @param placementCredits - Credits from Placement Tracker
 * @param ptPublisherIpis - PT's publisher IPIs
 * @param lineOriginalPublisherIpi - The Original Publisher IPI from this MLC line (determines who gets this line)
 */
export function calculateMlcShares(
  lineRevenue: number,
  placementCredits: PlacementCreditWithUser[],
  ptPublisherIpis: string[],
  lineOriginalPublisherIpi: string | null = null
): SplitCalculationResult {
  // Check if this line is for a PT Publisher
  const isPtPublisherLine = lineOriginalPublisherIpi &&
    ptPublisherIpis.some(ptIpi =>
      normalizeIPI(ptIpi) === normalizeIPI(lineOriginalPublisherIpi)
    );

  if (isPtPublisherLine) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CASE A: Line has PT Publisher IPI
    // This means the writers on this line don't have their own publishers.
    // Split ONLY among writers who use PT as their publisher (publisherIpiNumber is null or matches PT IPI)
    // ═══════════════════════════════════════════════════════════════════════════

    const eligibleCredits = placementCredits.filter(credit => {
      // Must be a PT writer (has userId and not external)
      if (!credit.userId || credit.isExternalWriter) return false;

      // Writer uses PT as publisher if:
      // 1. Their publisherIpiNumber is null/empty (defaults to PT)
      // 2. OR their publisherIpiNumber matches a PT Publisher IPI
      const writerPublisherIpi = credit.publisherIpiNumber;

      if (!writerPublisherIpi) {
        // No publisher IPI = uses PT as publisher
        return true;
      }

      // Check if writer's publisher is PT
      return ptPublisherIpis.some(ptIpi =>
        normalizeIPI(ptIpi) === normalizeIPI(writerPublisherIpi)
      );
    });

    console.log(`[MLC Split] PT Publisher line: ${eligibleCredits.length} eligible writers (of ${placementCredits.length} total credits)`);

    // Calculate proportional splits among only eligible writers
    return calculateWriterShares(lineRevenue, eligibleCredits, {
      proAffiliation: null,  // MLC includes all PROs
      ptPublisherIpis,
      includeOnlyPtWriters: false  // Already filtered above
    });

  } else if (lineOriginalPublisherIpi) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CASE B: Line has external publisher IPI (not PT)
    // Find the writer whose publisher IPI matches - they get 100%
    // ═══════════════════════════════════════════════════════════════════════════

    const matchingCredit = placementCredits.find(credit => {
      if (!credit.userId || credit.isExternalWriter) return false;
      if (!credit.publisherIpiNumber) return false;

      return normalizeIPI(credit.publisherIpiNumber) === normalizeIPI(lineOriginalPublisherIpi);
    });

    if (matchingCredit) {
      console.log(`[MLC Split] External publisher line: matched to ${matchingCredit.firstName} ${matchingCredit.lastName}`);
      // This writer gets the full line
      return calculateWriterShares(lineRevenue, [matchingCredit], {
        proAffiliation: null,
        ptPublisherIpis,
        includeOnlyPtWriters: false
      });
    } else {
      // No matching writer - return empty with exclusion info
      console.log(`[MLC Split] External publisher line: no matching writer for IPI ${lineOriginalPublisherIpi}`);
      return {
        shares: [],
        totalEligibleSplitPercent: 0,
        totalDistributedRevenue: 0,
        excludedCredits: placementCredits.map(c => ({
          creditId: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          reason: `Publisher IPI ${lineOriginalPublisherIpi} doesn't match any writer's publisher`
        }))
      };
    }

  } else {
    // ═══════════════════════════════════════════════════════════════════════════
    // CASE C: No publisher IPI provided (fallback to old behavior)
    // This shouldn't happen with properly parsed MLC statements, but handle gracefully
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`[MLC Split] No publisher IPI - using fallback (all PT writers)`);
    return calculateWriterShares(lineRevenue, placementCredits, {
      proAffiliation: null,  // MLC includes all PROs
      ptPublisherIpis,
      includeOnlyPtWriters: true  // Only PT-represented writers get this line
    });
  }
}

/**
 * Calculate shares for BMI statement processing
 *
 * BMI statements don't have writer names, so we:
 * 1. Match song to Placement Tracker
 * 2. Filter to BMI-affiliated PT writers only
 * 3. Split proportionally among them
 *
 * @param lineRevenue - The revenue amount from BMI
 * @param placementCredits - Credits from Placement Tracker
 * @param ptPublisherIpis - PT's publisher IPIs
 */
export function calculateBmiShares(
  lineRevenue: number,
  placementCredits: PlacementCreditWithUser[],
  ptPublisherIpis: string[]
): SplitCalculationResult {
  return calculateWriterShares(lineRevenue, placementCredits, {
    proAffiliation: 'BMI',  // Only BMI writers get BMI royalties
    ptPublisherIpis,
    includeOnlyPtWriters: true
  });
}

/**
 * Calculate shares for ASCAP statement processing
 *
 * ASCAP statements usually show individual writer lines, but we still
 * use Placement Tracker for validation and enrichment.
 *
 * @param lineRevenue - The revenue amount from ASCAP
 * @param placementCredits - Credits from Placement Tracker
 * @param ptPublisherIpis - PT's publisher IPIs
 */
export function calculateAscapShares(
  lineRevenue: number,
  placementCredits: PlacementCreditWithUser[],
  ptPublisherIpis: string[]
): SplitCalculationResult {
  return calculateWriterShares(lineRevenue, placementCredits, {
    proAffiliation: 'ASCAP',  // Only ASCAP writers get ASCAP royalties
    ptPublisherIpis,
    includeOnlyPtWriters: true
  });
}

/**
 * Format revenue for display (2-4 decimals based on magnitude)
 */
export function formatRevenueForDisplay(amount: number): string {
  if (Math.abs(amount) < 0.01) {
    // Show 4 decimals for micro-amounts
    return amount.toFixed(4);
  }
  // Show 2 decimals for larger amounts
  return amount.toFixed(2);
}

/**
 * Round revenue for payout (2 decimals only)
 * Only use this at final payout time, not during calculation/storage
 */
export function roundForPayout(amount: number): number {
  return Math.round(amount * 100) / 100;
}
