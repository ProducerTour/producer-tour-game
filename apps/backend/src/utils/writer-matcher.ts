import { prisma } from '../lib/prisma';

interface WriterMatch {
  writer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    ipiNumber: string | null;
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
      lastName: true,
      email: true,
      ipiNumber: true
    }
  });

  // Check if this is an MLC statement with multiple writers in metadata
  const mlcWriters = song.metadata?.writers;

  if (mlcWriters && mlcWriters.length > 0) {
    // MLC format: Multiple writers per song, iterate through each
    for (const mlcWriter of mlcWriters) {
      // Strategy 1: IPI Number Exact Match (100% confidence)
      if (mlcWriter.ipi) {
        const ipiMatch = allWriters.find(
          w => w.ipiNumber && w.ipiNumber === mlcWriter.ipi
        );

        if (ipiMatch) {
          matches.push({
            writer: ipiMatch,
            confidence: 100,
            reason: `IPI match: ${mlcWriter.name} (${mlcWriter.ipi})`
          });
          continue; // IPI match is definitive, skip name matching for this writer
        }
      }

      // Strategy 2: Writer Name Similarity
      if (mlcWriter.name) {
        allWriters.forEach(writer => {
          const fullName = `${writer.firstName || ''} ${writer.lastName || ''}`.trim();

          if (fullName) {
            const similarity = stringSimilarity(mlcWriter.name, fullName);

            // High confidence: >80% similarity
            if (similarity > 0.8) {
              // Check if already matched (e.g., by IPI)
              const alreadyMatched = matches.some(m => m.writer.id === writer.id);
              if (!alreadyMatched) {
                matches.push({
                  writer,
                  confidence: Math.round(similarity * 100),
                  reason: `Name similarity: "${mlcWriter.name}" ≈ "${fullName}"`
                });
              }
            }
          }
        });
      }
    }
  } else {
    // Traditional format (BMI/ASCAP): Single writer

    // Strategy 1: IPI Number Exact Match (100% confidence)
    if (song.writerIpiNumber) {
      const ipiMatch = allWriters.find(
        w => w.ipiNumber && w.ipiNumber === song.writerIpiNumber
      );

      if (ipiMatch) {
        matches.push({
          writer: ipiMatch,
          confidence: 100,
          reason: 'IPI number exact match'
        });
        return matches; // IPI match is definitive, return immediately
      }
    }

    // Strategy 2: Writer Name Similarity (parsed from statement)
    // ASCAP and some BMI statements include writer names
    if (song.writerName) {
      allWriters.forEach(writer => {
        const fullName = `${writer.firstName || ''} ${writer.lastName || ''}`.trim();

        if (fullName) {
          const similarity = stringSimilarity(song.writerName!, fullName);

          // High confidence: >80% similarity
          if (similarity > 0.8) {
            matches.push({
              writer,
              confidence: Math.round(similarity * 100),
              reason: `Name similarity: "${song.writerName}" ≈ "${fullName}"`
            });
          }
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
          lastName: true,
          email: true,
          ipiNumber: true
        }
      }
    },
    distinct: ['userId', 'workTitle']
  });

  const normalizedSongTitle = normalizeSongTitle(song.workTitle);

  historicalAssignments.forEach(assignment => {
    const normalizedHistoricalTitle = normalizeSongTitle(assignment.workTitle);
    const similarity = stringSimilarity(normalizedSongTitle, normalizedHistoricalTitle);

    // Very high similarity: >90% for historical matches
    if (similarity > 0.9) {
      // Check if this writer is already in matches
      const existingMatch = matches.find(m => m.writer.id === assignment.userId);

      if (!existingMatch) {
        matches.push({
          writer: assignment.user,
          confidence: Math.round(similarity * 90), // Cap at 90% for historical
          reason: `Similar song previously assigned: "${assignment.workTitle}"`
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
