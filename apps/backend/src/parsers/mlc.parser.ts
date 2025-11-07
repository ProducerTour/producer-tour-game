import Papa from 'papaparse';
import {
  StatementParseResult,
  ParsedSong,
  ParsedStatementItem,
  CSVRow,
} from './types';
import {
  parseAmountValue,
  normalizeSongTitle,
  parseIntValue,
} from './utils';

/**
 * MLC Statement Parser
 * Parses tab-separated (.tsv) MLC royalty statements
 *
 * Key differences from BMI/ASCAP:
 * - Uses TSV format (tab-delimited)
 * - Multiple writers per row (pipe-delimited)
 * - Each row represents a unique usage (DSP + subscription plan + territory)
 * - Revenue must be split equally among writers on each row
 */
export class MLCParser {
  /**
   * Parse MLC TSV statement file
   */
  async parse(tsvContent: string, filename: string): Promise<StatementParseResult> {
    const warnings: string[] = [];
    const songs = new Map<string, ParsedSong>();
    const items: ParsedStatementItem[] = [];

    // Parse TSV using PapaParse with tab delimiter
    const parseResult = Papa.parse<CSVRow>(tsvContent, {
      header: true,
      delimiter: '\t',  // Tab-separated
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    });

    // Log errors for debugging
    if (parseResult.errors.length > 0) {
      console.log('TSV Parse Warnings:', parseResult.errors.map(e => `${e.type}: ${e.message}`));
    }

    // Only throw on critical errors
    const criticalErrors = parseResult.errors.filter((error) => {
      const errorType = error.type as string;
      return !['FieldMismatch', 'TooFewFields', 'TooManyFields'].includes(errorType);
    });
    if (criticalErrors.length > 0) {
      throw new Error(`TSV Parse Error: ${criticalErrors[0].message}`);
    }

    const data = parseResult.data;
    if (data.length === 0) {
      throw new Error('Empty TSV file');
    }

    // Verify required columns exist
    const header = Object.keys(data[0]);
    const requiredColumns = [
      'Work Primary Title',
      'Work Writer List',
      'Work Writer IPI Name Number List',
      'Work Payable %',
      'Distributed Amount',
      'Number of Usages',
    ];

    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    let totalRevenue = 0;
    let totalPerformances = 0;

    // Process each row
    for (const row of data) {
      const title = row['Work Primary Title']?.trim();
      if (!title) continue;

      // Parse writers (pipe-delimited) - Work Writer List is METADATA ONLY for PT publisher disambiguation
      const writersStr = row['Work Writer List'] || '';
      const ipisStr = row['Work Writer IPI Name Number List'] || '';

      const writers = writersStr.split('|').map(w => w.trim()).filter(Boolean);
      const ipis = ipisStr.split('|').map(i => i.trim());

      if (writers.length === 0) {
        warnings.push(`Row skipped: No writers found for "${title}"`);
        continue;
      }

      // Parse revenue and performances
      const amount = parseAmountValue(row['Distributed Amount']);
      const performances = parseIntValue(row['Number of Usages']);

      if (amount === 0) continue;

      totalRevenue += amount;
      totalPerformances += performances;

      // Build writer data array (metadata only)
      const writerData = writers.map((name, idx) => ({
        name,
        ipi: ipis[idx] || null,
      }));

      // Extract Original Publisher info for publisher-aware matching
      const originalPublisherIpi = row['Original Publisher IPI Name Number']?.trim() || null;
      const originalPublisherName = row['Original Publisher Name']?.trim() || null;

      // Extract platform info for analytics
      const dspName = row['DSP Name']?.trim() || null;
      const consumerOffering = row['Consumer Offering']?.trim() || null;

      // Parse member's share percentage (optional)
      const memberShare = row['Work Payable %'] ? parseFloat(row['Work Payable %']) : null;

      // Create statement item for this row
      // Store FULL distributed amount - Smart Assign will match by Original Publisher IPI
      items.push({
        workTitle: title,
        revenue: amount,
        performances,
        metadata: {
          source: 'MLC',
          // Original Publisher (KEY for matching logic)
          originalPublisherIpi,
          originalPublisherName,
          // Work Writer List (for PT publisher disambiguation only)
          workWriterList: writerData,
          numWriters: writers.length,
          memberShare,
          // Platform data (for analytics)
          dspName,
          consumerOffering,
          territory: row['Territory'] || null,
          isrc: row['ISRC'] || null,
          artist: row['Recording Display Artist Name'] || null,
          album: row['Product Title'] || null,
          usagePeriodStart: row['Usage Period Start Date'] || null,
          usagePeriodEnd: row['Usage Period End Date'] || null,
          distributionDate: row['Distribution Date'] || null,
        },
      });

      // Aggregate song data for summary view
      const normalizedTitle = normalizeSongTitle(title);

      if (!songs.has(normalizedTitle)) {
        songs.set(normalizedTitle, {
          title,
          titleVariations: new Set([title]),
          totalRevenue: 0,
          totalPerformances: 0,
          occurrences: 0,
          amounts: [],
        });
      }

      const song = songs.get(normalizedTitle)!;
      song.totalRevenue += amount;
      song.totalPerformances += performances;
      song.occurrences++;
      song.amounts.push(amount);
      song.titleVariations.add(title);
    }

    return {
      songs,
      items,
      totalRevenue,
      totalPerformances,
      songCount: songs.size,
      warnings,
      metadata: {
        pro: 'MLC',
        filename,
        parsedAt: new Date().toISOString(),
        rowCount: data.length,
      },
    };
  }
}
