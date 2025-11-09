import Papa from 'papaparse';
import {
  StatementParseResult,
  ParsedSong,
  ParsedStatementItem,
  CSVRow,
} from './types';
import {
  parseAmountValue,
  findHeaderIndexByKeywords,
  normalizeSongTitle,
  parseIntValue,
} from './utils';

/**
 * ASCAP Statement Parser
 * Ported from WordPress PHP: parse_ascap_statement_file()
 * Location: producer-royalty-portal.php lines 605-750+
 */
export class ASCAPParser {
  /**
   * Parse ASCAP CSV statement file
   */
  async parse(csvContent: string, filename: string): Promise<StatementParseResult> {
    const warnings: string[] = [];
    const songs = new Map<string, ParsedSong>();
    const items: ParsedStatementItem[] = [];

    // Parse CSV using PapaParse
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      delimitersToGuess: [',', '\t', '|', ';'],
    });

    // Log all errors for debugging
    if (parseResult.errors.length > 0) {
      console.log('CSV Parse Warnings:', parseResult.errors.map(e => `${e.type}: ${e.message}`));
    }

    // Only throw on critical errors, ignore field count mismatches
    const criticalErrors = parseResult.errors.filter(
      (error) => !['FieldMismatch', 'TooFewFields', 'TooManyFields', 'Quotes', 'Delimiter'].includes(error.type as string)
    );
    if (criticalErrors.length > 0) {
      throw new Error(`CSV Parse Error: ${criticalErrors[0].message}`);
    }

    const data = parseResult.data;
    if (data.length === 0) {
      throw new Error('Empty CSV file');
    }

    // Get header row
    const header = Object.keys(data[0]);

    // Find columns using flexible keyword matching (same as PHP version)
    const titleKeywords = [
      'work title',
      'song title',
      'title name',
      'composition title',
    ];
    const amountKeywords = [
      'dollars',
      'amount',
      'net amount',
      'royalty amount',
    ];
    const writerKeywords = [
      'composer name',
      'writer name',
      'writer',
      'member name',
    ];
    const performancesKeywords = [
      'performance',
      'performances',
      'units',
      'count',
    ];
    const territoryKeywords = [
      'territory',
      'country',
      'region',
      'location',
    ];

    const titleIndex = findHeaderIndexByKeywords(header, titleKeywords);
    const amountIndex = findHeaderIndexByKeywords(header, amountKeywords);
    const writerIndex = findHeaderIndexByKeywords(header, writerKeywords);
    const performancesIndex = findHeaderIndexByKeywords(
      header,
      performancesKeywords
    );
    const territoryIndex = findHeaderIndexByKeywords(header, territoryKeywords);

    // Validate required columns found
    if (titleIndex === -1) {
      throw new Error(
        `Required column not found. Looking for: ${titleKeywords.join(', ')}`
      );
    }
    if (amountIndex === -1) {
      throw new Error(
        `Required column not found. Looking for: ${amountKeywords.join(', ')}`
      );
    }

    const titleCol = header[titleIndex];
    const amountCol = header[amountIndex];
    const writerCol = writerIndex !== -1 ? header[writerIndex] : null;
    const performancesCol =
      performancesIndex !== -1 ? header[performancesIndex] : null;
    const territoryCol =
      territoryIndex !== -1 ? header[territoryIndex] : null;

    let totalRevenue = 0;
    let totalPerformances = 0;

    // Process each row (same logic as PHP)
    for (const row of data) {
      const title = row[titleCol]?.trim();
      const amountStr = row[amountCol];

      if (!title) continue; // Skip empty titles

      const amount = parseAmountValue(amountStr);
      const performances = performancesCol
        ? parseIntValue(row[performancesCol])
        : 0;
      const writer = writerCol ? row[writerCol]?.trim() : null;
      const territory = territoryCol ? row[territoryCol]?.trim() || null : null;

      totalRevenue += amount;
      totalPerformances += performances;

      // Aggregate by normalized title (same as PHP)
      const normalizedTitle = normalizeSongTitle(title);

      if (songs.has(normalizedTitle)) {
        const existing = songs.get(normalizedTitle)!;
        existing.totalAmount += amount;
        existing.performances += performances;
        existing.occurrences += 1;
        existing.metadata.individualAmounts.push(amount);
        if (!existing.metadata.titleVariations.includes(title)) {
          existing.metadata.titleVariations.push(title);
        }
        if (writer && !existing.metadata.writers?.includes(writer)) {
          if (!existing.metadata.writers) {
            existing.metadata.writers = [];
          }
          existing.metadata.writers.push(writer);
        }
      } else {
        songs.set(normalizedTitle, {
          title,
          totalAmount: amount,
          performances,
          occurrences: 1,
          metadata: {
            source: 'ASCAP',
            titleVariations: [title],
            individualAmounts: [amount],
            writers: writer ? [writer] : [],
          },
        });
      }

      // Create item for database insertion
      items.push({
        workTitle: title,
        revenue: amount,
        performances,
        metadata: {
          source: 'ASCAP',
          writer,
          rawRow: row,
          territory,
        },
      });
    }

    return {
      songs,
      items,
      totalRevenue,
      totalPerformances,
      songCount: songs.size,
      warnings,
      metadata: {
        pro: 'ASCAP',
        filename,
        parsedAt: new Date().toISOString(),
        rowCount: data.length,
      },
    };
  }
}
