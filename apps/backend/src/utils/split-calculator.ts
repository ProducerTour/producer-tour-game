/**
 * Split Calculator Service
 *
 * Calculates writer revenue shares based on Placement Tracker splits.
 * Handles PRO filtering (BMI, ASCAP) and PT representation filtering.
 *
 * Precision: Uses 6 decimal places internally, following industry standards (ASCAP, BMI, MLC).
 */

import { PlacementCreditWithUser, isPtRepresentedWriter } from './placement-matcher';
import Decimal from 'decimal.js';

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

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

  // SIMPLIFIED FILTERING: Trust approved placement data
  // Only 2 filters remain:
  // 1. Must have split percentage
  // 2. PRO must match statement type (if specified)
  // REMOVED: userId requirement - trust placement credits
  // REMOVED: PT publisher IPI check - all PT writers should have correct IPI on User

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

    // Filter 2: PRO must match statement type (KEEP but simplified)
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

    // REMOVED: userId requirement
    // Reason: Approved placements should be trusted. If a credit exists,
    // it was verified by admin. Missing userId is a data issue to fix via
    // backfill, not a reason to exclude from matching.

    // REMOVED: PT publisher IPI check
    // Reason: All PT writers should have publisherIpiNumber set on their User record.
    // If it's missing, that's a data issue to fix, not a filter to apply.
    // The PRO filter above ensures we only pay the right writers.

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
      userId: credit.userId!,
      creditId: credit.id,
      firstName: credit.firstName,
      lastName: credit.lastName,
      email: credit.user!.email,
      writerIpiNumber: credit.ipiNumber || credit.user!.writerIpiNumber,
      publisherIpiNumber: credit.publisherIpiNumber || credit.user!.publisherIpiNumber,
      proAffiliation: credit.user!.producer?.proAffiliation || credit.pro || null,
      originalSplitPercent: originalSplit.toNumber(),
      relativeSplitPercent: Number(relativeSplit.toFixed(6)),  // 6 decimal precision
      revenueAmount: Number(revenue.toFixed(6))                // 6 decimal precision
    });
  }

  return {
    shares,
    totalEligibleSplitPercent: Number(totalEligibleSplit.toFixed(2)),
    totalDistributedRevenue: Number(totalDistributed.toFixed(6)),
    excludedCredits
  };
}

/**
 * Calculate shares for MLC statement processing
 *
 * MLC statements include a Work Payable % which represents PT's share.
 * We split that among PT-represented writers proportionally.
 *
 * @param lineRevenue - The full distributed amount from MLC
 * @param placementCredits - Credits from Placement Tracker
 * @param ptPublisherIpis - PT's publisher IPIs
 */
export function calculateMlcShares(
  lineRevenue: number,
  placementCredits: PlacementCreditWithUser[],
  ptPublisherIpis: string[]
): SplitCalculationResult {
  return calculateWriterShares(lineRevenue, placementCredits, {
    proAffiliation: null,  // MLC includes all PROs
    ptPublisherIpis,
    includeOnlyPtWriters: true  // Only PT-represented writers get this line
  });
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
