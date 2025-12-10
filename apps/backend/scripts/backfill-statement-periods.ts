/**
 * Backfill Statement Periods
 *
 * This script analyzes existing statements and extracts period information
 * from their metadata, then updates the statementPeriod, periodStart, and periodEnd fields.
 *
 * Period extraction by PRO:
 * - BMI: Quarter field in rows (e.g., "20251" = Q1 2025)
 * - MLC: Usage Period Start/End dates in metadata
 * - ASCAP: Infer from filename or dates
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

interface ParsedItem {
  quarter?: string;
  metadata?: {
    usagePeriodStart?: string;
    usagePeriodEnd?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface StatementMetadata {
  pro?: string;
  parsedItems?: ParsedItem[];
  [key: string]: any;
}

// Convert BMI quarter format (20251) to readable format (Q1 2025)
function parseBMIQuarter(quarter: string): { period: string; start: Date; end: Date } | null {
  if (!quarter || quarter.length !== 5) return null;

  const year = parseInt(quarter.substring(0, 4));
  const q = parseInt(quarter.substring(4));

  if (isNaN(year) || isNaN(q) || q < 1 || q > 4) return null;

  const quarterMonths: Record<number, { start: number; end: number }> = {
    1: { start: 0, end: 2 },   // Jan-Mar
    2: { start: 3, end: 5 },   // Apr-Jun
    3: { start: 6, end: 8 },   // Jul-Sep
    4: { start: 9, end: 11 }   // Oct-Dec
  };

  const months = quarterMonths[q];
  const start = new Date(year, months.start, 1);
  const end = new Date(year, months.end + 1, 0); // Last day of end month

  return {
    period: `Q${q} ${year}`,
    start,
    end
  };
}

// Parse MLC dates - Use distributionDate, NOT usage period range
// MLC statements span multiple usage periods (historical playback) but represent a single distribution
function parseMLCPeriod(items: ParsedItem[]): { period: string; start: Date; end: Date } | null {
  // First, try to get distributionDate - this is what the user expects to see
  // (e.g., "Aug 2024" for an August distribution, not "May 2023 - May 2025" usage range)
  for (const item of items) {
    const distributionDateStr = item.metadata?.distributionDate;
    if (distributionDateStr) {
      const distributionDate = new Date(distributionDateStr);
      if (!isNaN(distributionDate.getTime())) {
        const period = distributionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        // Use same date for start/end since it's a single distribution
        return { period, start: distributionDate, end: distributionDate };
      }
    }
  }

  // Fallback to usage period range if no distribution date (for backwards compatibility)
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const item of items) {
    const startStr = item.metadata?.usagePeriodStart;
    const endStr = item.metadata?.usagePeriodEnd;

    if (startStr) {
      const start = new Date(startStr);
      if (!isNaN(start.getTime())) {
        if (!minStart || start < minStart) minStart = start;
      }
    }

    if (endStr) {
      const end = new Date(endStr);
      if (!isNaN(end.getTime())) {
        if (!maxEnd || end > maxEnd) maxEnd = end;
      }
    }
  }

  if (!minStart || !maxEnd) return null;

  // Format the period string
  const startMonth = minStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endMonth = maxEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // If same month, just show one
  const period = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;

  return { period, start: minStart, end: maxEnd };
}

// Try to extract period from filename
function parseFilenameForPeriod(filename: string): { period: string; start: Date; end: Date } | null {
  // Common patterns:
  // - "Q1 2025", "Q1_2025", "Q12025"
  // - "2025-Q1", "2025_Q1"
  // - "Jan 2025", "January 2025"
  // - "2025-01", "202501"

  const quarterPattern = /[Qq](\d)\s*[-_]?\s*(\d{4})|(\d{4})\s*[-_]?\s*[Qq](\d)/;
  const monthYearPattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*[-_]?\s*(\d{4})/i;
  const yearMonthPattern = /(\d{4})[-_]?(\d{2})/;

  // Try quarter pattern
  const quarterMatch = filename.match(quarterPattern);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1] || quarterMatch[4]);
    const year = parseInt(quarterMatch[2] || quarterMatch[3]);
    const result = parseBMIQuarter(`${year}${q}`);
    if (result) return result;
  }

  // Try month-year pattern
  const monthYearMatch = filename.match(monthYearPattern);
  if (monthYearMatch) {
    const monthStr = monthYearMatch[1];
    const year = parseInt(monthYearMatch[2]);
    const monthMap: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined && !isNaN(year)) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const period = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { period, start, end };
    }
  }

  // Try year-month pattern (YYYY-MM or YYYYMM)
  const yearMonthMatch = filename.match(yearMonthPattern);
  if (yearMonthMatch) {
    const year = parseInt(yearMonthMatch[1]);
    const month = parseInt(yearMonthMatch[2]) - 1; // 0-indexed
    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const period = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { period, start, end };
    }
  }

  return null;
}

// Extract period from ASCAP statement
function parseASCAPPeriod(metadata: StatementMetadata, filename: string): { period: string; start: Date; end: Date } | null {
  // First try to get from filename
  const fromFilename = parseFilenameForPeriod(filename);
  if (fromFilename) return fromFilename;

  // ASCAP may have distribution date or other metadata
  // Try to find any date-related fields in metadata
  const items = metadata.parsedItems || [];

  // Look for any date fields in items
  let dates: Date[] = [];
  for (const item of items.slice(0, 100)) { // Sample first 100 items
    // Check various possible date fields
    for (const key of Object.keys(item)) {
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('period')) {
        const dateStr = item[key];
        if (typeof dateStr === 'string') {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            dates.push(date);
          }
        }
      }
    }
  }

  if (dates.length > 0) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const period = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
    return { period, start, end };
  }

  return null;
}

async function backfillStatementPeriods() {
  console.log('=== BACKFILLING STATEMENT PERIODS ===\n');

  // Get all statements that don't have period info yet
  const statements = await prisma.statement.findMany({
    where: {
      OR: [
        { statementPeriod: null },
        { statementPeriod: '' }
      ]
    },
    select: {
      id: true,
      filename: true,
      proType: true,
      metadata: true,
      statementPeriod: true,
      periodStart: true,
      periodEnd: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${statements.length} statements without period info\n`);

  const updates: Array<{
    id: string;
    filename: string;
    proType: string;
    period: string;
    periodStart: Date;
    periodEnd: Date;
  }> = [];

  const failures: Array<{
    id: string;
    filename: string;
    proType: string;
    reason: string;
  }> = [];

  for (const statement of statements) {
    const metadata = statement.metadata as StatementMetadata | null;
    const proType = (statement.proType || metadata?.pro || '').toUpperCase();

    let result: { period: string; start: Date; end: Date } | null = null;

    try {
      if (proType === 'BMI') {
        // Extract quarter from first parsedItem that has it
        const items = metadata?.parsedItems || [];
        for (const item of items) {
          if (item.quarter) {
            result = parseBMIQuarter(item.quarter);
            if (result) break;
          }
        }

        // Fallback to filename
        if (!result) {
          result = parseFilenameForPeriod(statement.filename);
        }
      } else if (proType === 'MLC') {
        // Get date range from usage periods
        const items = metadata?.parsedItems || [];
        result = parseMLCPeriod(items);

        // Fallback to filename
        if (!result) {
          result = parseFilenameForPeriod(statement.filename);
        }
      } else if (proType === 'ASCAP') {
        result = parseASCAPPeriod(metadata || {}, statement.filename);
      } else {
        // Unknown PRO, try filename
        result = parseFilenameForPeriod(statement.filename);
      }

      if (result) {
        updates.push({
          id: statement.id,
          filename: statement.filename,
          proType,
          period: result.period,
          periodStart: result.start,
          periodEnd: result.end
        });
      } else {
        failures.push({
          id: statement.id,
          filename: statement.filename,
          proType,
          reason: 'Could not extract period info'
        });
      }
    } catch (error) {
      failures.push({
        id: statement.id,
        filename: statement.filename,
        proType,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  console.log(`\n=== RESULTS ===\n`);
  console.log(`Successfully extracted: ${updates.length}`);
  console.log(`Failed to extract: ${failures.length}`);

  if (updates.length > 0) {
    console.log(`\n=== UPDATES TO APPLY ===\n`);
    for (const update of updates) {
      console.log(`${update.proType}: ${update.filename}`);
      console.log(`  → Period: ${update.period}`);
      console.log(`  → Start: ${update.periodStart.toISOString().split('T')[0]}`);
      console.log(`  → End: ${update.periodEnd.toISOString().split('T')[0]}`);
      console.log('');
    }

    // Apply updates
    console.log(`\n=== APPLYING UPDATES ===\n`);

    for (const update of updates) {
      await prisma.statement.update({
        where: { id: update.id },
        data: {
          statementPeriod: update.period,
          periodStart: update.periodStart,
          periodEnd: update.periodEnd
        }
      });
      console.log(`✅ Updated: ${update.filename} → ${update.period}`);
    }

    console.log(`\n=== DONE ===`);
    console.log(`Updated ${updates.length} statements with period information.`);
  }

  if (failures.length > 0) {
    console.log(`\n=== FAILURES (need manual review) ===\n`);
    for (const failure of failures) {
      console.log(`❌ ${failure.proType}: ${failure.filename}`);
      console.log(`   Reason: ${failure.reason}`);
    }
  }

  await prisma.$disconnect();
}

backfillStatementPeriods().catch(console.error);
