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
  metadata?: {
    source?: string;
    writers?: Array<{ name: string; ipi: string | null }>;
    [key: string]: any;
  };
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
 * Supports both single-writer format (BMI/ASCAP) and multi-writer format (MLC)
 */
export async function smartMatchWriters(song: ParsedSong): Promise<WriterMatch[]> {
  const matches: WriterMatch[] = [];

  // Get all writers
  const allWriters = await prisma.user.findMany({
    where: { role: 'WRITER' },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      writerIpiNumber: true,
      publisherIpiNumber: true
    }
  });

  // Check if this is an MLC statement with multiple writers in metadata
  const mlcWriters = song.metadata?.writers;

  if (mlcWriters && mlcWriters.length > 0) {
    // MLC format: Multiple writers per song, iterate through each
    for (const mlcWriter of mlcWriters) {
      // Strategy 1: IPI Number Exact Match (100% confidence)
      // Check both writer IPI and publisher IPI with normalization
      if (mlcWriter.ipi) {
        const normalizedMlcIpi = normalizeIPI(mlcWriter.ipi);
        const ipiMatch = allWriters.find(
          w => (w.writerIpiNumber && normalizeIPI(w.writerIpiNumber) === normalizedMlcIpi) ||
               (w.publisherIpiNumber && normalizeIPI(w.publisherIpiNumber) === normalizedMlcIpi)
        );

        if (ipiMatch) {
          const matchedVia = ipiMatch.writerIpiNumber && normalizeIPI(ipiMatch.writerIpiNumber) === normalizedMlcIpi
            ? 'Writer IPI'
            : 'Publisher IPI';
          matches.push({
            writer: ipiMatch,
            confidence: 100,
            reason: `${matchedVia} match: ${mlcWriter.name} (${mlcWriter.ipi})`
          });
          continue; // IPI match is definitive, skip name matching for this writer
        }
      }

      // Strategy 2: Writer Name Similarity with multiple matching approaches
      if (mlcWriter.name) {
        allWriters.forEach(writer => {
          // Check if already matched (e.g., by IPI)
          const alreadyMatched = matches.some(m => m.writer.id === writer.id);
          if (alreadyMatched) return;

          const fullName = `${writer.firstName || ''} ${writer.middleName || ''} ${writer.lastName || ''}`.trim().replace(/\s+/g, ' ');
          if (!fullName) return;

          // Approach 1: Full name similarity
          const fullNameSimilarity = stringSimilarity(mlcWriter.name, fullName);

          // Approach 2: Last name exact match + first name initial
          // E.g., "J. Smith" should match "John Smith"
          const firstName = writer.firstName || '';
          const lastName = writer.lastName || '';
          let lastNameMatch = false;
          let firstNameInitialMatch = false;

          if (lastName) {
            const mlcLower = mlcWriter.name.toLowerCase();
            const lastNameLower = lastName.toLowerCase();
            lastNameMatch = mlcLower.includes(lastNameLower) || lastNameLower.includes(mlcLower.split(' ').pop() || '');

            if (lastNameMatch && firstName) {
              const firstInitial = firstName.charAt(0).toLowerCase();
              firstNameInitialMatch = mlcLower.charAt(0) === firstInitial;
            }
          }

          // Calculate confidence based on best match
          let confidence = 0;
          let reason = '';

          if (fullNameSimilarity >= 0.70) {
            // Good full name similarity (70%+ = 70-100% confidence)
            confidence = Math.round(fullNameSimilarity * 100);
            reason = `Name similarity: "${mlcWriter.name}" ≈ "${fullName}" (${confidence}%)`;
          } else if (lastNameMatch && firstNameInitialMatch) {
            // Last name + first initial match (85% confidence)
            confidence = 85;
            reason = `Name match: "${mlcWriter.name}" ≈ "${firstName.charAt(0)}. ${lastName}"`;
          } else if (lastNameMatch) {
            // Last name only match (75% confidence)
            confidence = 75;
            reason = `Last name match: "${mlcWriter.name}" contains "${lastName}"`;
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
  const historicalAssignments = await prisma.statementItem.findMany({
    where: {
      statement: { status: 'PUBLISHED' }
    },
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
 * Smart match all songs in a parsed statement
 * Returns a map of song title to matches
 */
export async function smartMatchStatement(
  parsedSongs: ParsedSong[]
): Promise<Map<string, WriterMatch[]>> {
  const matchResults = new Map<string, WriterMatch[]>();

  for (const song of parsedSongs) {
    const matches = await smartMatchWriters(song);
    matchResults.set(song.workTitle, matches);
  }

  return matchResults;
}
