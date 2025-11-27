import { prisma } from '../lib/prisma';

interface WriterMatch {
  writer: {
    id: string;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    email: string;
    writerIpiNumber: string | null;
    publisherIpiNumber: string | null;
  };
  confidence: number;
  reason: string;
}

interface ParsedSong {
  workTitle: string;
  writerName?: string;
  writerIpiNumber?: string;
  revenue?: number;
  performances?: number;
  metadata?: {
    source?: string;
    writers?: Array<{ name: string; ipi: string | null }>;
    [key: string]: any;
  };
}

// New interface for publisher-row level match results (MLC format)
export interface PublisherRowMatch {
  workTitle: string;
  revenue: number;
  performances: number;
  metadata: any;
  matches: WriterMatch[];
}

// Options for writer matching
export interface MatcherOptions {
  proType?: 'BMI' | 'ASCAP' | 'SESAC' | 'GMR' | 'MLC' | 'SOCAN' | 'PRS' | 'OTHER';
}

/**
 * Calculate Levenshtein distance between two strings
 * Used to measure similarity between writer names
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
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - (distance / maxLength);
}

/**
 * Normalize song title for matching
 * Removes special characters, extra spaces, and converts to lowercase
 */
function normalizeSongTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Collapse multiple spaces
    .trim();
}

/**
 * Normalize IPI number for matching
 * Removes spaces, dashes, dots, and leading zeros
 */
function normalizeIPI(ipi: string): string {
  return ipi
    .replace(/[\s\-\.]/g, '') // Remove spaces, dashes, dots
    .replace(/^0+/, '');       // Remove leading zeros
}

/**
 * Smart match writers for a parsed song
 * Uses multiple strategies: IPI number, name similarity, historical assignments
 *
 * MLC Format (Publisher-Aware Matching):
 * - If Original Publisher = Producer Tour → Match multiple writers from Work Writer List who use PT
 * - If Original Publisher ≠ Producer Tour → Direct 1:1 match by publisherIpiNumber
 *
 * BMI/ASCAP Format (Traditional):
 * - Single writer, match by writer IPI or name similarity
 * - For BMI: Only matches writers with proAffiliation = 'BMI'
 * - For ASCAP: Only matches writers with proAffiliation = 'ASCAP'
 */
export async function smartMatchWriters(song: ParsedSong, options: MatcherOptions = {}): Promise<WriterMatch[]> {
  const matches: WriterMatch[] = [];
  const { proType } = options;

  // Build writer query - filter by PRO affiliation for traditional formats (BMI, ASCAP, etc.)
  // MLC uses publisher IPI matching, so PRO affiliation is less relevant
  const writerWhereClause: any = { role: 'WRITER' };

  // For BMI/ASCAP/SESAC/GMR statements, only match writers with that PRO affiliation
  if (proType && proType !== 'MLC' && proType !== 'OTHER') {
    writerWhereClause.producer = {
      proAffiliation: proType
    };
  }

  // Get writers (filtered by PRO if applicable)
  const allWriters = await prisma.user.findMany({
    where: writerWhereClause,
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      writerIpiNumber: true,
      publisherIpiNumber: true,
      producer: {
        select: {
          proAffiliation: true
        }
      }
    }
  });

  // Check if this is MLC format (has Original Publisher IPI)
  const originalPublisherIpi = song.metadata?.originalPublisherIpi;
  const originalPublisherName = song.metadata?.originalPublisherName;
  const workWriterList = song.metadata?.workWriterList;

  if (originalPublisherIpi && workWriterList) {
    // ==================== MLC FORMAT: PUBLISHER-AWARE MATCHING ====================

    // Get all active Producer Tour publisher IPIs from settings
    const ptPublishers = await prisma.producerTourPublisher.findMany({
      where: { isActive: true },
      select: { ipiNumber: true, publisherName: true }
    });

    const normalizedOriginalPublisherIpi = normalizeIPI(originalPublisherIpi);
    const isProducerTourPublisher = ptPublishers.some(
      pt => normalizeIPI(pt.ipiNumber) === normalizedOriginalPublisherIpi
    );

    if (isProducerTourPublisher) {
      // CASE A: Original Publisher = Producer Tour
      // Match ALL writers from Work Writer List who use PT as their publisher
      const ptPublisherName = ptPublishers.find(
        pt => normalizeIPI(pt.ipiNumber) === normalizedOriginalPublisherIpi
      )?.publisherName || 'Producer Tour';

      for (const workWriter of workWriterList) {
        // Try IPI match first
        let matched = false;

        if (workWriter.ipi) {
          const normalizedWorkWriterIpi = normalizeIPI(workWriter.ipi);

          const ipiMatch = allWriters.find(w =>
            w.writerIpiNumber && normalizeIPI(w.writerIpiNumber) === normalizedWorkWriterIpi &&
            w.publisherIpiNumber && normalizeIPI(w.publisherIpiNumber) === normalizedOriginalPublisherIpi
          );

          if (ipiMatch) {
            matches.push({
              writer: ipiMatch,
              confidence: 100,
              reason: `Writer IPI + PT Publisher match: ${workWriter.name} (${workWriter.ipi}) via ${ptPublisherName}`
            });
            matched = true;
          }
        }

        // Try name match if IPI didn't work
        if (!matched && workWriter.name) {
          allWriters.forEach(writer => {
            // Skip if already matched or doesn't use PT as publisher
            if (matches.some(m => m.writer.id === writer.id)) return;
            if (!writer.publisherIpiNumber || normalizeIPI(writer.publisherIpiNumber) !== normalizedOriginalPublisherIpi) return;

            const fullName = `${writer.firstName || ''} ${writer.middleName || ''} ${writer.lastName || ''}`.trim().replace(/\s+/g, ' ');
            if (!fullName) return;

            const fullNameSimilarity = stringSimilarity(workWriter.name, fullName);

            if (fullNameSimilarity >= 0.70) {
              const confidence = Math.round(fullNameSimilarity * 100);
              matches.push({
                writer,
                confidence,
                reason: `Name + PT Publisher match: "${workWriter.name}" ≈ "${fullName}" (${confidence}%) via ${ptPublisherName}`
              });
            }
          });
        }
      }

      // Calculate split percentage for matched PT writers
      if (matches.length > 0) {
        // Split equally among all matched PT writers
        // Note: This percentage will be applied during publish, not here
      }

    } else {
      // CASE B: Original Publisher ≠ Producer Tour
      // Direct 1:1 match by publisherIpiNumber
      const publisherMatch = allWriters.find(w =>
        w.publisherIpiNumber && normalizeIPI(w.publisherIpiNumber) === normalizedOriginalPublisherIpi
      );

      if (publisherMatch) {
        matches.push({
          writer: publisherMatch,
          confidence: 100,
          reason: `Publisher IPI match: ${originalPublisherName || 'Unknown Publisher'} (${originalPublisherIpi})`
        });
      }
    }

  } else if (song.metadata?.writers) {
    // Legacy MLC format (old parser) - fallback to old logic
    // This shouldn't happen with the new parser, but keeping for safety
    const mlcWriters = song.metadata.writers;
    for (const mlcWriter of mlcWriters) {
      if (mlcWriter.ipi) {
        const normalizedMlcIpi = normalizeIPI(mlcWriter.ipi);
        const ipiMatch = allWriters.find(
          w => (w.writerIpiNumber && normalizeIPI(w.writerIpiNumber) === normalizedMlcIpi) ||
               (w.publisherIpiNumber && normalizeIPI(w.publisherIpiNumber) === normalizedMlcIpi)
        );

        if (ipiMatch) {
          matches.push({
            writer: ipiMatch,
            confidence: 100,
            reason: `Legacy IPI match: ${mlcWriter.name} (${mlcWriter.ipi})`
          });
        }
      }
    }
  } else {
    // Traditional format (BMI/ASCAP): Single writer

    // Strategy 1: IPI Number Exact Match (100% confidence)
    // Check both writer IPI and publisher IPI with normalization
    if (song.writerIpiNumber) {
      const normalizedSongIpi = normalizeIPI(song.writerIpiNumber);
      const ipiMatch = allWriters.find(
        w => (w.writerIpiNumber && normalizeIPI(w.writerIpiNumber) === normalizedSongIpi) ||
             (w.publisherIpiNumber && normalizeIPI(w.publisherIpiNumber) === normalizedSongIpi)
      );

      if (ipiMatch) {
        const matchedVia = ipiMatch.writerIpiNumber && normalizeIPI(ipiMatch.writerIpiNumber) === normalizedSongIpi
          ? 'Writer IPI'
          : 'Publisher IPI';
        matches.push({
          writer: ipiMatch,
          confidence: 100,
          reason: `${matchedVia} number exact match`
        });
        return matches; // IPI match is definitive, return immediately
      }
    }

    // Strategy 2: Writer Name Similarity (parsed from statement)
    // ASCAP and some BMI statements include writer names
    if (song.writerName) {
      allWriters.forEach(writer => {
        const fullName = `${writer.firstName || ''} ${writer.middleName || ''} ${writer.lastName || ''}`.trim().replace(/\s+/g, ' ');
        if (!fullName) return;

        // Approach 1: Full name similarity
        const fullNameSimilarity = stringSimilarity(song.writerName!, fullName);

        // Approach 2: Last name exact match + first name initial
        const firstName = writer.firstName || '';
        const lastName = writer.lastName || '';
        let lastNameMatch = false;
        let firstNameInitialMatch = false;

        if (lastName) {
          const writerNameLower = song.writerName!.toLowerCase();
          const lastNameLower = lastName.toLowerCase();
          lastNameMatch = writerNameLower.includes(lastNameLower) || lastNameLower.includes(writerNameLower.split(' ').pop() || '');

          if (lastNameMatch && firstName) {
            const firstInitial = firstName.charAt(0).toLowerCase();
            firstNameInitialMatch = writerNameLower.charAt(0) === firstInitial;
          }
        }

        // Calculate confidence based on best match
        let confidence = 0;
        let reason = '';

        if (fullNameSimilarity >= 0.70) {
          confidence = Math.round(fullNameSimilarity * 100);
          reason = `Name similarity: "${song.writerName}" ≈ "${fullName}" (${confidence}%)`;
        } else if (lastNameMatch && firstNameInitialMatch) {
          confidence = 85;
          reason = `Name match: "${song.writerName}" ≈ "${firstName.charAt(0)}. ${lastName}"`;
        } else if (lastNameMatch) {
          confidence = 75;
          reason = `Last name match: "${song.writerName}" contains "${lastName}"`;
        }

        if (confidence >= 70) {
          matches.push({
            writer,
            confidence,
            reason
          });
        }
      });
    }
  }

  // Strategy 3: Historical Assignment Match (song title similarity)
  // If this song was assigned to a writer before, likely the same writer
  // SKIP for MLC format - workWriterList is the source of truth
  const isMlcFormat = originalPublisherIpi && workWriterList;

  if (!isMlcFormat) {
    // Build historical query - filter by PRO type and writer's PRO affiliation
    const historicalWhereClause: any = {
      statement: { status: 'PUBLISHED' }
    };

    // For BMI/ASCAP/etc. statements, only look at historical assignments from:
    // 1. Statements of the same PRO type
    // 2. Writers who have that PRO affiliation
    if (proType && proType !== 'MLC' && proType !== 'OTHER') {
      historicalWhereClause.statement.proType = proType;
      historicalWhereClause.user = {
        producer: {
          proAffiliation: proType
        }
      };
    }

    const historicalAssignments = await prisma.statementItem.findMany({
    where: historicalWhereClause,
    select: {
      workTitle: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          writerIpiNumber: true,
          publisherIpiNumber: true
        }
      }
    },
    distinct: ['userId', 'workTitle']
  });

  const normalizedSongTitle = normalizeSongTitle(song.workTitle);

  historicalAssignments.forEach(assignment => {
    const normalizedHistoricalTitle = normalizeSongTitle(assignment.workTitle);
    const similarity = stringSimilarity(normalizedSongTitle, normalizedHistoricalTitle);

    // Historical matching with proper confidence scaling
    // Perfect matches (100% similarity) = 100% confidence (auto-assign)
    // Very high similarity (95-99%) = 95-99% confidence (auto-assign)
    // High similarity (90-94%) = 90-94% confidence (auto-assign)
    // Medium similarity (85-89%) = 85-89% confidence (suggested)
    if (similarity >= 0.85) {
      // Check if this writer is already in matches
      const existingMatch = matches.find(m => m.writer.id === assignment.userId);

      if (!existingMatch) {
        // Use similarity directly as confidence (scaled to 100)
        const confidence = Math.round(similarity * 100);
        matches.push({
          writer: assignment.user,
          confidence: confidence,
          reason: similarity >= 0.99
            ? `Exact song match previously assigned: "${assignment.workTitle}"`
            : `Similar song previously assigned: "${assignment.workTitle}" (${confidence}% match)`
        });
      } else {
        // Boost confidence if multiple strategies match
        existingMatch.confidence = Math.min(100, existingMatch.confidence + 10);
        existingMatch.reason += ' + historical match';
      }
    }
  });
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicate writers (keep highest confidence)
  const uniqueMatches = matches.filter(
    (match, index, self) =>
      self.findIndex(m => m.writer.id === match.writer.id) === index
  );

  return uniqueMatches;
}

/**
 * Smart match all songs in a statement
 * For MLC statements: Returns ALL publisher rows (same song can appear multiple times with different publishers)
 * For traditional statements: Returns one row per song
 *
 * @param parsedSongs - Array of parsed songs from the statement
 * @param options - Matching options including proType for PRO-filtered matching
 */
export async function smartMatchStatement(
  parsedSongs: ParsedSong[],
  options: MatcherOptions = {}
): Promise<PublisherRowMatch[]> {
  const results: PublisherRowMatch[] = [];

  for (const song of parsedSongs) {
    const matches = await smartMatchWriters(song, options);

    // Preserve ALL rows with their publisher-specific metadata and matches
    results.push({
      workTitle: song.workTitle,
      revenue: song.revenue || 0,
      performances: song.performances || 0,
      metadata: song.metadata || {},
      matches
    });
  }

  return results;
}
