/**
 * Leak Scanner Service
 *
 * Cross-checks song catalogs against multiple databases to detect
 * metadata issues that could cause missing royalties.
 *
 * Generates a FICO-style score (0-100) for each song based on:
 * - ISWC presence
 * - ISRC presence
 * - Publisher registration
 * - Writer/split conflicts
 * - PRO registration (BMI/ASCAP)
 */

import axios from 'axios';
import { prisma } from '../lib/prisma';
import { spotifyService } from './spotify.service';

// Issue severity types
type Severity = 'critical' | 'high' | 'medium' | 'low';

// Issue definition interface
interface IssueDefinition {
  code: string;
  description: string;
  severity: Severity;
  deduction: number;
  fixInstructions: string;
}

// Issue definitions with point deductions
const ISSUE_DEFINITIONS: Record<string, IssueDefinition> = {
  MISSING_ISWC: {
    code: 'MISSING_ISWC',
    description: 'No ISWC (International Standard Musical Work Code) registered',
    severity: 'critical',
    deduction: 25,
    fixInstructions: 'Register the work with your PRO (ASCAP, BMI, SESAC) to obtain an ISWC.'
  },
  MISSING_ISRC: {
    code: 'MISSING_ISRC',
    description: 'No ISRC (International Standard Recording Code) found',
    severity: 'critical',
    deduction: 20,
    fixInstructions: 'Request an ISRC from your distributor or register with an ISRC agency.'
  },
  CONFLICTING_SPLITS: {
    code: 'CONFLICTING_SPLITS',
    description: 'Split percentages across sources do not match or exceed 100%',
    severity: 'high',
    deduction: 20,
    fixInstructions: 'Contact your publisher and PRO to reconcile the split discrepancies.'
  },
  MISSING_PUBLISHER: {
    code: 'MISSING_PUBLISHER',
    description: 'No publisher registration found',
    severity: 'high',
    deduction: 15,
    fixInstructions: 'Register your work with a publisher or self-publish through your PRO.'
  },
  NO_PRO_REGISTRATION: {
    code: 'NO_PRO_REGISTRATION',
    description: 'Work not found in BMI or ASCAP databases',
    severity: 'high',
    deduction: 15,
    fixInstructions: 'Register this work with your PRO to receive performance royalties.'
  },
  MISSING_WRITER: {
    code: 'MISSING_WRITER',
    description: 'Writer credits incomplete or missing',
    severity: 'medium',
    deduction: 10,
    fixInstructions: 'Update writer credits with your PRO and publisher.'
  },
  TITLE_MISMATCH: {
    code: 'TITLE_MISMATCH',
    description: 'Title variations found across different sources',
    severity: 'medium',
    deduction: 10,
    fixInstructions: 'Verify the official title and update registrations to match.'
  },
  WRITER_MISMATCH: {
    code: 'WRITER_MISMATCH',
    description: 'Writer credits in database differ from your records',
    severity: 'high',
    deduction: 15,
    fixInstructions: 'Verify writer splits with your PRO. Mismatched credits can cause royalty leakage.'
  },
  WRITER_NOT_REGISTERED: {
    code: 'WRITER_NOT_REGISTERED',
    description: 'Your writer credit not found in any database',
    severity: 'high',
    deduction: 15,
    fixInstructions: 'Register this work with your PRO (ASCAP/BMI/SESAC) to ensure you receive writer royalties.'
  },
  MISSING_RELEASE_DATE: {
    code: 'MISSING_RELEASE_DATE',
    description: 'No release date found in metadata',
    severity: 'low',
    deduction: 5,
    fixInstructions: 'Add release date to your metadata across all platforms.'
  },
  INCOMPLETE_METADATA: {
    code: 'INCOMPLETE_METADATA',
    description: 'Metadata fields are incomplete',
    severity: 'low',
    deduction: 5,
    fixInstructions: 'Complete all metadata fields including genre, album, and label info.'
  },
  SPLITS_NOT_100: {
    code: 'SPLITS_NOT_100',
    description: 'Writer splits do not add up to 100%',
    severity: 'critical',
    deduction: 25,
    fixInstructions: 'Update writer splits to total exactly 100%. Current total indicates missing or incorrect credits.'
  },
  SPLITS_OVER_100: {
    code: 'SPLITS_OVER_100',
    description: 'Writer splits exceed 100%',
    severity: 'critical',
    deduction: 25,
    fixInstructions: 'Splits total over 100% - this will cause payment issues. Reconcile with all writers immediately.'
  },
  NO_PRO_ON_CREDIT: {
    code: 'NO_PRO_ON_CREDIT',
    description: 'Writer credit missing PRO affiliation',
    severity: 'medium',
    deduction: 10,
    fixInstructions: 'Add PRO (ASCAP, BMI, SESAC) affiliation for each writer to ensure proper royalty routing.'
  },
  MISSING_IPI: {
    code: 'MISSING_IPI',
    description: 'Writer credit missing IPI/CAE number',
    severity: 'medium',
    deduction: 10,
    fixInstructions: 'Add IPI numbers for writers. This unique identifier ensures royalties are matched correctly.'
  },
  MULTIPLE_PROS_SAME_WORK: {
    code: 'MULTIPLE_PROS_SAME_WORK',
    description: 'Writers on this work are registered with different PROs',
    severity: 'low',
    deduction: 5,
    fixInstructions: 'Not necessarily an issue, but verify all parties have registered with their respective PROs.'
  }
};

// Grade calculation
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

function calculateGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Song input interface
export interface SongInput {
  title: string;
  artist?: string;
  writer?: string;
  isrc?: string;
  iswc?: string;
  publisher?: string;
  releaseDate?: string;
}

// Placement input with credits (from Prisma model)
export interface PlacementCredit {
  firstName: string;
  lastName: string;
  role: string;
  splitPercentage: number | any; // Decimal from Prisma
  pro?: string | null;
  ipiNumber?: string | null;
  isPrimary: boolean;
}

export interface PlacementInput {
  id: string;
  title: string;
  artist: string;
  isrc?: string | null;
  spotifyTrackId?: string | null;
  releaseDate?: Date | null;
  musicbrainzId?: string | null;
  credits: PlacementCredit[];
}

// Scan result interface
export interface ScanResult {
  song: SongInput;
  score: number;
  grade: Grade;
  issues: Array<{
    code: string;
    description: string;
    severity: Severity;
    deduction: number;
    fixInstructions: string;
  }>;
  sources: {
    musicbrainz?: {
      found: boolean;
      recordings?: any[];
      works?: any[];
    };
    spotify?: {
      found: boolean;
      track?: any;
    };
    discogs?: {
      found: boolean;
      releases?: any[];
    };
    songview?: {
      found: boolean;
      results?: SongviewResult[];
      writerCount?: number;
      publisherCount?: number;
    };
    mlc?: {
      found: boolean;
      results?: MlcResult[];
      hfaCodes?: string[];
    };
  };
  foundData: {
    isrcs: string[];
    iswcs: string[];
    artists: string[];
    writers: string[];
    writersDetail: WriterDetail[];  // Full writer info with IPI/PRO affiliation
    publishers: string[];
    publishersDetail: WriterDetail[]; // Full publisher info with IPI
    titleVariations: string[];
    releaseDates: string[];
  };
  scannedAt: string;
}

// MusicBrainz API configuration
const MUSICBRAINZ_API_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = 'ProducerTourLeakScanner/1.0 (https://producertour.com)';

/**
 * Make a rate-limited request to MusicBrainz API
 */
async function musicbrainzRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const searchParams = new URLSearchParams({ ...params, fmt: 'json' });

  try {
    // MusicBrainz requires 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1100));

    const response = await axios.get(`${MUSICBRAINZ_API_URL}/${endpoint}?${searchParams}`, {
      headers: {
        'User-Agent': MUSICBRAINZ_USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.error('MusicBrainz API error:', error);
    return null;
  }
}

/**
 * Search MusicBrainz for recordings (songs)
 */
async function searchMusicBrainzRecording(title: string, artist: string = ''): Promise<any[]> {
  let query = `recording:"${title}"`;
  if (artist) {
    query += ` AND artist:"${artist}"`;
  }

  const data = await musicbrainzRequest('recording', { query, limit: '5' });

  if (!data || !data.recordings) {
    return [];
  }

  return data.recordings.map((rec: any) => ({
    source: 'MusicBrainz',
    mbid: rec.id,
    title: rec.title,
    lengthMs: rec.length,
    artists: rec['artist-credit']?.map((a: any) => a.name).join(', ') || '',
    isrcs: rec.isrcs || [],
    score: rec.score || 0,
    releases: rec.releases?.slice(0, 3).map((r: any) => ({
      title: r.title,
      date: r.date,
      country: r.country
    })) || []
  }));
}

/**
 * Search MusicBrainz for works (compositions)
 */
async function searchMusicBrainzWork(title: string, composer: string = ''): Promise<any[]> {
  let query = `work:"${title}"`;
  if (composer) {
    query += ` AND artist:"${composer}"`;
  }

  const data = await musicbrainzRequest('work', { query, limit: '5' });

  if (!data || !data.works) {
    return [];
  }

  return data.works.map((work: any) => ({
    source: 'MusicBrainz',
    mbid: work.id,
    title: work.title,
    type: work.type,
    iswcs: work.iswcs || [],
    score: work.score || 0,
    language: work.language
  }));
}

/**
 * Fetch detailed work info including writer relations
 */
async function fetchWorkDetails(workMbid: string): Promise<any> {
  // Fetch work with artist relations (writers, composers, lyricists)
  const data = await musicbrainzRequest(`work/${workMbid}`, { inc: 'artist-rels' });

  if (!data) return null;

  const writers: string[] = [];
  const relations = data.relations || [];

  // Extract writer/composer credits from relations
  for (const rel of relations) {
    if (rel.type === 'writer' || rel.type === 'composer' || rel.type === 'lyricist' || rel.type === 'arranger') {
      if (rel.artist?.name) {
        writers.push(rel.artist.name);
      }
    }
  }

  return {
    mbid: data.id,
    title: data.title,
    iswcs: data.iswcs || [],
    writers
  };
}

/**
 * Fetch detailed recording info including artist relations
 */
async function fetchRecordingDetails(recordingMbid: string): Promise<any> {
  // Fetch recording with work relations to find writers
  const data = await musicbrainzRequest(`recording/${recordingMbid}`, { inc: 'work-rels+artist-rels' });

  if (!data) return null;

  const writers: string[] = [];
  const producers: string[] = [];
  const relations = data.relations || [];

  // Extract producer credits from recording relations
  for (const rel of relations) {
    if (rel.type === 'producer' || rel.type === 'mix' || rel.type === 'engineer') {
      if (rel.artist?.name) {
        producers.push(rel.artist.name);
      }
    }
  }

  // Get work relations to find writers
  const workRelations = relations.filter((r: any) => r.type === 'performance' && r.work);

  return {
    mbid: data.id,
    title: data.title,
    producers,
    linkedWorks: workRelations.map((r: any) => r.work?.id).filter(Boolean)
  };
}

// ============================================================================
// Python Scraper API (BMI/ASCAP Songview) - runs on localhost:5001
// ============================================================================

const PYTHON_SCRAPER_URL = process.env.PYTHON_SCRAPER_URL || 'http://localhost:5001';

// Detailed writer/publisher info with IPI numbers
interface WriterDetail {
  name: string;
  affiliation: string;  // PRO affiliation (BMI, ASCAP, etc.)
  ipi: string;          // IPI/CAE number
}

interface SongviewResult {
  source: string;
  title: string;
  writers: string;
  performers: string;
  publishers: string;
  cover_art?: string;
  iswc?: string;  // ISWC from BMI Songview expanded detail section
  writers_detail?: WriterDetail[];   // Full writer info with IPI
  publishers_detail?: WriterDetail[]; // Full publisher info with IPI
}

interface MlcResult {
  source: string;
  title: string;
  hfa_code: string;  // HFA Song Code - unique identifier for mechanical licensing
  writers: string[];
  publishers: string[];
  share_percentage?: string;
  iswc?: string;
}

/**
 * Search MLC (Mechanical Licensing Collective) for mechanical royalty registration
 * Returns HFA codes, writers, publishers for mechanical royalty verification
 */
async function searchMLC(title: string, writer?: string): Promise<MlcResult[]> {
  try {
    const params = new URLSearchParams({ title });
    if (writer) params.append('writer', writer);

    const response = await axios.get(`${PYTHON_SCRAPER_URL}/api/mlc?${params.toString()}`, {
      timeout: 60000 // 60 second timeout for Selenium scraping
    });

    if (response.data.status === 'success' && response.data.results) {
      return response.data.results;
    }
    return [];
  } catch (error: any) {
    console.log(`[LeakScanner] MLC search error: ${error.message}`);
    return [];
  }
}

/**
 * Clean a song title for PRO database search
 * Removes featuring credits, parenthetical info that confuses BMI/ASCAP search
 * "Come Outside (feat. YTB Fatt)" -> "Come Outside"
 * "Money Trees (feat. Jay Rock)" -> "Money Trees"
 */
function cleanTitleForPROSearch(title: string): string {
  return title
    // Remove featuring credits in various formats
    .replace(/\s*\(feat\.?\s+[^)]+\)/gi, '')  // (feat. Artist)
    .replace(/\s*\[feat\.?\s+[^]]+\]/gi, '')  // [feat. Artist]
    .replace(/\s*feat\.?\s+.+$/gi, '')        // feat. Artist at end
    .replace(/\s*ft\.?\s+.+$/gi, '')          // ft. Artist at end
    .replace(/\s*featuring\s+.+$/gi, '')      // featuring Artist at end
    // Remove other parenthetical suffixes that confuse search
    .replace(/\s*\(remix\)/gi, '')
    .replace(/\s*\(radio edit\)/gi, '')
    .replace(/\s*\(clean\)/gi, '')
    .replace(/\s*\(explicit\)/gi, '')
    .trim();
}

/**
 * Clean artist name - extract primary artist for search
 * "Icewear Vezzo, YTB Fatt" -> "Icewear Vezzo"
 */
function cleanArtistForPROSearch(artist: string): string {
  // Take first artist if comma-separated
  return artist.split(',')[0].split('&')[0].trim();
}

/**
 * Call the Python scraper API to get BMI/ASCAP PRO data
 * This scraper uses Selenium to search Songview (joint BMI/ASCAP database)
 */
async function searchPRODatabase(title: string, artist: string = ''): Promise<{
  found: boolean;
  writers: string[];
  writersDetail: WriterDetail[];  // Full writer info with IPI/PRO affiliation
  publishers: string[];
  publishersDetail: WriterDetail[]; // Full publisher info with IPI
  performers: string[];
  iswcs: string[];  // ISWCs extracted from BMI Songview
  results: SongviewResult[];
}> {
  // Clean title and artist for better BMI/ASCAP search results
  const cleanedTitle = cleanTitleForPROSearch(title);
  const cleanedArtist = cleanArtistForPROSearch(artist);

  console.log(`[LeakScanner] PRO search - Original: "${title}" by "${artist}"`);
  console.log(`[LeakScanner] PRO search - Cleaned: "${cleanedTitle}" by "${cleanedArtist}"`);

  try {
    const response = await axios.post(
      `${PYTHON_SCRAPER_URL}/api/song/score`,
      {
        title: cleanedTitle,
        artist: cleanedArtist,
        cross_check: false // We do our own cross-check, just need PRO data
      },
      { timeout: 45000 } // Selenium scraping can be slow
    );

    const data = response.data;

    if (data.status !== 'success' || !data.songview_results?.length) {
      return { found: false, writers: [], writersDetail: [], publishers: [], publishersDetail: [], performers: [], iswcs: [], results: [] };
    }

    // Aggregate writers, publishers, performers, and ISWCs from all results
    const writers: string[] = [];
    const writersDetail: WriterDetail[] = [];
    const publishers: string[] = [];
    const publishersDetail: WriterDetail[] = [];
    const performers: string[] = [];
    const iswcs: string[] = [];

    for (const result of data.songview_results) {
      if (result.writers && result.writers !== '-') {
        writers.push(...result.writers.split(',').map((w: string) => w.trim()));
      }
      // Extract detailed writer info with IPI numbers
      if (result.writers_detail && Array.isArray(result.writers_detail)) {
        for (const wd of result.writers_detail) {
          if (wd.name && !writersDetail.some(w => w.name === wd.name && w.ipi === wd.ipi)) {
            writersDetail.push({
              name: wd.name,
              affiliation: wd.affiliation || '',
              ipi: wd.ipi || ''
            });
          }
        }
      }
      if (result.publishers && result.publishers !== '-') {
        publishers.push(...result.publishers.split(',').map((p: string) => p.trim()));
      }
      // Extract detailed publisher info with IPI numbers
      if (result.publishers_detail && Array.isArray(result.publishers_detail)) {
        for (const pd of result.publishers_detail) {
          if (pd.name && !publishersDetail.some(p => p.name === pd.name && p.ipi === pd.ipi)) {
            publishersDetail.push({
              name: pd.name,
              affiliation: pd.affiliation || '',
              ipi: pd.ipi || ''
            });
          }
        }
      }
      if (result.performers && result.performers !== '-') {
        performers.push(...result.performers.split(',').map((p: string) => p.trim()));
      }
      // Extract ISWC from result (new field from Python scraper)
      if (result.iswc && result.iswc !== '-' && result.iswc !== '') {
        iswcs.push(result.iswc);
        console.log(`[LeakScanner] Found ISWC from Songview: ${result.iswc} for "${result.title}"`);
      }
    }

    console.log(`[LeakScanner] PRO Database (Songview) found ${data.songview_results.length} results, ${writersDetail.length} writers with IPI, ${iswcs.length} ISWCs`);

    return {
      found: true,
      writers: [...new Set(writers)],
      writersDetail,
      publishers: [...new Set(publishers)],
      publishersDetail,
      performers: [...new Set(performers)],
      iswcs: [...new Set(iswcs)],
      results: data.songview_results
    };
  } catch (error: any) {
    // Check if Python scraper is just not running (expected in dev sometimes)
    if (error.code === 'ECONNREFUSED') {
      console.log('[LeakScanner] Python scraper not running - skipping PRO database search');
    } else {
      console.error('[LeakScanner] PRO database search error:', error.message);
    }
    return { found: false, writers: [], writersDetail: [], publishers: [], publishersDetail: [], performers: [], iswcs: [], results: [] };
  }
}

// ============================================================================
// Discogs API (Free, rate limited)
// ============================================================================

const DISCOGS_API_URL = 'https://api.discogs.com';
const DISCOGS_USER_AGENT = 'ProducerTourLeakScanner/1.0';
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || '';
const DISCOGS_CONSUMER_KEY = process.env.DISCOGS_CONSUMER_KEY || '';
const DISCOGS_CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET || '';

/**
 * Search Discogs for releases
 * Supports two auth methods: token OR key/secret
 */
async function searchDiscogs(title: string, artist: string = ''): Promise<any[]> {
  // Check for any valid authentication
  const hasToken = !!DISCOGS_TOKEN;
  const hasKeySecret = !!DISCOGS_CONSUMER_KEY && !!DISCOGS_CONSUMER_SECRET;

  if (!hasToken && !hasKeySecret) {
    console.log('[LeakScanner] Discogs search skipped - no credentials configured');
    return [];
  }

  const headers: Record<string, string> = {
    'User-Agent': DISCOGS_USER_AGENT,
    'Accept': 'application/json'
  };

  // Prefer token auth, fall back to key/secret
  if (hasToken) {
    headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
  }

  const query = artist ? `${artist} - ${title}` : title;

  try {
    // Rate limiting (Discogs allows 60 requests/min with auth)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Build params - include key/secret if using that auth method
    const params: Record<string, any> = {
      type: 'release',
      q: query,
      per_page: 10
    };

    // If using key/secret auth (and no token), add to params
    if (!hasToken && hasKeySecret) {
      params.key = DISCOGS_CONSUMER_KEY;
      params.secret = DISCOGS_CONSUMER_SECRET;
    }

    const response = await axios.get(`${DISCOGS_API_URL}/database/search`, {
      params,
      headers,
      timeout: 15000
    });

    if (!response.data || !response.data.results) {
      return [];
    }

    console.log(`[LeakScanner] Discogs found ${response.data.results.length} releases`);

    return response.data.results.map((item: any) => ({
      source: 'Discogs',
      id: item.id,
      title: item.title,
      type: item.type,
      year: item.year,
      country: item.country,
      genre: item.genre || [],
      style: item.style || [],
      label: item.label || [],
      catno: item.catno,
      format: item.format || [],
      thumb: item.thumb,
      uri: item.uri
    }));
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('[LeakScanner] Discogs API returned 401 - token may be invalid');
    } else {
      console.error('[LeakScanner] Discogs API error:', error.message || error);
    }
    return [];
  }
}

// ============================================================================
// Spotify Search for Leak Scanner
// ============================================================================

/**
 * Search Spotify for track and extract metadata
 */
async function searchSpotifyTrack(title: string, artist: string = ''): Promise<{
  found: boolean;
  track?: any;
  isrc?: string;
  artists?: string[];
  releaseDate?: string;
  popularity?: number;
}> {
  // Check if Spotify is enabled
  if (!spotifyService.isEnabled()) {
    return { found: false };
  }

  try {
    const query = artist ? `${artist} ${title}` : title;
    const tracks = await spotifyService.searchTracks(query, 3);

    if (tracks.length === 0) {
      return { found: false };
    }

    // Find best match (first result or one that matches artist)
    const bestMatch = tracks[0];
    const formatted = spotifyService.formatTrackData(bestMatch);

    return {
      found: true,
      track: {
        id: formatted.id,
        name: formatted.title,
        artist: formatted.artist,
        album: formatted.album,
        releaseDate: formatted.releaseDate,
        isrc: formatted.isrc,
        popularity: formatted.popularity,
        duration: formatted.duration,
        image: formatted.image,
        spotifyUrl: formatted.spotifyUrl,
        explicit: bestMatch.explicit
      },
      isrc: formatted.isrc || undefined,
      artists: [formatted.artist],
      releaseDate: formatted.releaseDate,
      popularity: formatted.popularity
    };
  } catch (error) {
    console.error('Spotify search error:', error);
    return { found: false };
  }
}

/**
 * Normalize writer name for comparison (handles variations like "Nully Beats" vs "NullyBeats")
 */
function normalizeWriterName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove spaces, punctuation
    .trim();
}

/**
 * Check if a writer name matches any in a list (fuzzy match)
 * Handles different name formats: "Nolan Griffis" vs "GRIFFIS NOLAN J"
 */
function writerMatches(userWriter: string, dbWriters: string[]): boolean {
  const normalizedUser = normalizeWriterName(userWriter);

  // Extract individual name parts (words) from user input
  const userWords = userWriter.toLowerCase()
    .replace(/[^a-z\s]/g, '') // Keep only letters and spaces
    .split(/\s+/)
    .filter(w => w.length > 1); // Filter out single letters like middle initials

  return dbWriters.some(dbWriter => {
    const normalizedDb = normalizeWriterName(dbWriter);

    // 1. Exact normalized match
    if (normalizedDb === normalizedUser) return true;

    // 2. Contains check (one name is substring of other)
    if (normalizedDb.includes(normalizedUser) || normalizedUser.includes(normalizedDb)) return true;

    // 3. Word-based matching: check if key name parts appear in db writer
    // "Nolan Griffis" should match "GRIFFIS NOLAN J" because both words appear
    const dbWords = dbWriter.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);

    // Check if at least 2 words match, or if all user words match
    const matchingWords = userWords.filter(uw =>
      dbWords.some(dw => dw.includes(uw) || uw.includes(dw))
    );

    // Match if 2+ words match OR if all significant user words match
    if (matchingWords.length >= 2 ||
        (userWords.length > 0 && matchingWords.length === userWords.length)) {
      return true;
    }

    return false;
  });
}

/**
 * Calculate title similarity using Levenshtein-ish approach (simple version)
 * Returns a score from 0 to 1
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const a = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = title2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Word-level overlap
  const wordsA = title1.toLowerCase().split(/\s+/);
  const wordsB = title2.toLowerCase().split(/\s+/);
  const overlap = wordsA.filter(w => wordsB.includes(w)).length;
  const maxWords = Math.max(wordsA.length, wordsB.length);

  return overlap / maxWords;
}

/**
 * Calculate match score for a Songview result against known data
 * Higher score = better match
 */
function scoreSongviewMatch(
  result: SongviewResult,
  searchTitle: string,
  knownArtist: string | null,
  knownWriter: string | null,
  knownPerformers: string[]
): number {
  let score = 0;

  // Title match (0-40 points)
  const titleSim = calculateTitleSimilarity(searchTitle, result.title);
  score += titleSim * 40;

  // Performer/artist match (0-40 points)
  const resultPerformers = result.performers?.split(',').map(p => p.trim().toLowerCase()) || [];

  // Check against known artist from Spotify
  if (knownArtist) {
    const normalizedKnown = knownArtist.toLowerCase().replace(/[^a-z0-9]/g, '');
    const artistMatch = resultPerformers.some(p => {
      const normalizedP = p.replace(/[^a-z0-9]/g, '');
      return normalizedP.includes(normalizedKnown) || normalizedKnown.includes(normalizedP);
    });
    if (artistMatch) score += 40;
  }

  // Also check against all known performers from other sources
  for (const performer of knownPerformers) {
    const normalizedKnown = performer.toLowerCase().replace(/[^a-z0-9]/g, '');
    const artistMatch = resultPerformers.some(p => {
      const normalizedP = p.replace(/[^a-z0-9]/g, '');
      return normalizedP.includes(normalizedKnown) || normalizedKnown.includes(normalizedP);
    });
    if (artistMatch) {
      score += 20; // Partial credit for secondary performer matches
      break;
    }
  }

  // Writer match if provided (0-20 points)
  if (knownWriter && result.writers && result.writers !== '-') {
    const resultWriters = result.writers.split(',').map(w => w.trim());
    if (writerMatches(knownWriter, resultWriters)) {
      score += 20;
    }
  }

  return score;
}

interface RankedSongviewResult extends SongviewResult {
  matchScore: number;
}

/**
 * Filter and rank Songview results using cross-source data
 * Returns only results that score above threshold, sorted by match score
 */
function filterSongviewResults(
  results: SongviewResult[],
  searchTitle: string,
  knownArtist: string | null,
  knownWriter: string | null,
  knownPerformers: string[],
  minScore: number = 30 // Minimum score to be considered a match
): RankedSongviewResult[] {
  const scored = results.map(result => ({
    ...result,
    matchScore: scoreSongviewMatch(result, searchTitle, knownArtist, knownWriter, knownPerformers)
  }));

  // Filter by minimum score and sort descending
  return scored
    .filter(r => r.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Calculate metadata score and identify issues for a single song
 *
 * This function searches multiple databases (MusicBrainz, Spotify, Discogs) to:
 * 1. DISCOVER metadata the user may not have (ISRCs, ISWCs, writers)
 * 2. VERIFY user-provided metadata against external sources
 * 3. IDENTIFY conflicts or issues that could cause royalty leakage
 */
export async function calculateMetadataScore(song: SongInput): Promise<ScanResult> {
  const issues: ScanResult['issues'] = [];
  const sources: ScanResult['sources'] = {};
  const foundData: ScanResult['foundData'] = {
    isrcs: [],
    iswcs: [],
    artists: [],
    writers: [],
    writersDetail: [],
    publishers: [],
    publishersDetail: [],
    titleVariations: [],
    releaseDates: []
  };

  // Start with perfect score
  let score = 100;

  console.log(`[LeakScanner] Scanning: "${song.title}" by ${song.artist || 'Unknown'}`);

  // =========================================================================
  // SEARCH ALL SOURCES IN PARALLEL FOR SPEED
  // =========================================================================

  // Start Spotify search first (usually fastest and best for hip-hop)
  const spotifyPromise = searchSpotifyTrack(song.title, song.artist || '');

  // Start Discogs search
  const discogsPromise = searchDiscogs(song.title, song.artist || '');

  // Start MusicBrainz searches (rate limited, slower)
  const mbRecordingsPromise = searchMusicBrainzRecording(song.title, song.artist || '');
  const mbWorksPromise = searchMusicBrainzWork(song.title, song.writer || song.artist || '');

  // Start PRO Database search (BMI/ASCAP Songview via Python scraper)
  const proPromise = searchPRODatabase(song.title, song.artist || '');

  // Start MLC search (mechanical royalties)
  const mlcPromise = searchMLC(song.title, song.writer);

  // =========================================================================
  // SPOTIFY RESULTS - Best source for ISRCs and modern tracks
  // =========================================================================
  try {
    const spotifyResult = await spotifyPromise;

    if (spotifyResult.found && spotifyResult.track) {
      sources.spotify = {
        found: true,
        track: spotifyResult.track
      };

      // Extract ISRC - this is the GOLD for hip-hop tracks!
      if (spotifyResult.isrc) {
        foundData.isrcs.push(spotifyResult.isrc);
        console.log(`[LeakScanner] Found ISRC from Spotify: ${spotifyResult.isrc}`);
      }

      // Extract artists
      if (spotifyResult.artists) {
        foundData.artists.push(...spotifyResult.artists);
      }

      // Extract release date
      if (spotifyResult.releaseDate) {
        foundData.releaseDates.push(spotifyResult.releaseDate);
      }
    } else {
      sources.spotify = { found: false };
    }
  } catch (error) {
    console.error('[LeakScanner] Spotify search error:', error);
    sources.spotify = { found: false };
  }

  // =========================================================================
  // DISCOGS RESULTS - Good for release info and title variations
  // =========================================================================
  try {
    const discogsResults = await discogsPromise;

    if (discogsResults.length > 0) {
      sources.discogs = {
        found: true,
        releases: discogsResults.slice(0, 5)
      };

      // Extract release years and labels from Discogs
      // NOTE: Discogs titles are ALBUM names (e.g., "Artist - Album"), NOT individual song titles
      // So we don't add them to titleVariations - only use Discogs for release years and labels
      for (const release of discogsResults) {
        if (release.year) {
          foundData.releaseDates.push(String(release.year));
        }
        // Extract labels as potential publishers
        if (release.label && release.label.length > 0) {
          foundData.publishers.push(...release.label);
        }
      }
      console.log(`[LeakScanner] Found ${discogsResults.length} releases on Discogs`);
    } else {
      sources.discogs = { found: false };
    }
  } catch (error) {
    console.error('[LeakScanner] Discogs search error:', error);
    sources.discogs = { found: false };
  }

  // =========================================================================
  // MLC RESULTS - Mechanical royalty registration (HFA codes, writers, publishers)
  // =========================================================================
  try {
    const mlcResults = await mlcPromise;

    if (mlcResults.length > 0) {
      const hfaCodes = mlcResults
        .filter(r => r.hfa_code)
        .map(r => r.hfa_code);

      sources.mlc = {
        found: true,
        results: mlcResults.slice(0, 5),
        hfaCodes
      };

      // Extract writers and publishers from MLC
      for (const result of mlcResults) {
        if (result.writers) {
          foundData.writers.push(...result.writers);
        }
        if (result.publishers) {
          foundData.publishers.push(...result.publishers);
        }
        // MLC may also have ISWCs
        if (result.iswc) {
          foundData.iswcs.push(result.iswc);
        }
      }

      console.log(`[LeakScanner] Found ${mlcResults.length} works in MLC (${hfaCodes.length} HFA codes)`);
    } else {
      sources.mlc = { found: false };
    }
  } catch (error) {
    console.error('[LeakScanner] MLC search error:', error);
    sources.mlc = { found: false };
  }

  // =========================================================================
  // MUSICBRAINZ RESULTS - Best for ISWCs and writer credits
  // =========================================================================
  try {
    const [recordings, works] = await Promise.all([mbRecordingsPromise, mbWorksPromise]);

    sources.musicbrainz = {
      found: recordings.length > 0 || works.length > 0,
      recordings: recordings.slice(0, 5),
      works: works.slice(0, 5)
    };

    // Extract titles, ISRCs and artist info from recordings
    for (const rec of recordings) {
      // Add recording title to titleVariations (main fix for MusicBrainz title matching)
      if (rec.title) {
        foundData.titleVariations.push(rec.title);
        console.log(`[LeakScanner] Found title from MusicBrainz recording: "${rec.title}"`);
      }
      if (rec.isrcs) {
        foundData.isrcs.push(...rec.isrcs);
      }
      if (rec.artists) {
        foundData.artists.push(rec.artists);
      }
      for (const release of rec.releases || []) {
        if (release.date) {
          foundData.releaseDates.push(release.date);
        }
      }

      // Fetch detailed recording info to get producers (often credited as writers in hip-hop)
      if (rec.mbid && recordings.indexOf(rec) === 0) {
        try {
          const recordingDetails = await fetchRecordingDetails(rec.mbid);
          if (recordingDetails?.producers) {
            foundData.writers.push(...recordingDetails.producers);
          }
        } catch (e) {
          // Non-critical, continue
        }
      }
    }

    // Extract ISWCs and writer credits from works
    for (const work of works) {
      if (work.iswcs) {
        foundData.iswcs.push(...work.iswcs);
        console.log(`[LeakScanner] Found ISWC from MusicBrainz: ${work.iswcs.join(', ')}`);
      }
      // Add work title to titleVariations (always add, even if matches - shows we found it)
      if (work.title) {
        foundData.titleVariations.push(work.title);
        console.log(`[LeakScanner] Found title from MusicBrainz work: "${work.title}"`);
      }

      // Fetch detailed work info to get writer relations
      if (work.mbid && works.indexOf(work) < 2) {
        try {
          const workDetails = await fetchWorkDetails(work.mbid);
          if (workDetails?.writers) {
            foundData.writers.push(...workDetails.writers);
            console.log(`[LeakScanner] Found writers from MusicBrainz: ${workDetails.writers.join(', ')}`);
          }
        } catch (e) {
          // Non-critical, continue
        }
      }
    }
  } catch (error) {
    console.error('[LeakScanner] MusicBrainz search error:', error);
    sources.musicbrainz = { found: false };
  }

  // =========================================================================
  // PRO DATABASE RESULTS (BMI/ASCAP Songview) - Official PRO registrations!
  // Uses cross-source data (Spotify artist, MusicBrainz) to filter results
  // =========================================================================
  try {
    const proResult = await proPromise;

    if (proResult.found && proResult.results.length > 0) {
      // Get known artist from Spotify (most reliable for hip-hop)
      const spotifyArtist = sources.spotify?.track?.artist || null;

      // Collect all known performers from other sources for cross-reference
      const knownPerformers: string[] = [
        ...foundData.artists,
        song.artist || ''
      ].filter(a => a && a.length > 0);

      console.log(`[LeakScanner] PRO Search returned ${proResult.results.length} raw results`);
      console.log(`[LeakScanner] Cross-referencing with Spotify artist: "${spotifyArtist}", known performers: ${knownPerformers.slice(0, 3).join(', ')}`);

      // Filter and rank results using cross-source data
      const filteredResults = filterSongviewResults(
        proResult.results,
        song.title,
        spotifyArtist,
        song.writer || null,
        knownPerformers,
        30 // Minimum score threshold
      );

      console.log(`[LeakScanner] After cross-source filtering: ${filteredResults.length} matched results (from ${proResult.results.length} total)`);

      if (filteredResults.length > 0) {
        // Extract writers, publishers, and ISWCs ONLY from matched results
        const matchedWriters: string[] = [];
        const matchedWritersDetail: WriterDetail[] = [];
        const matchedPublishers: string[] = [];
        const matchedPublishersDetail: WriterDetail[] = [];
        const matchedIswcs: string[] = [];

        // Use top 3 matches (best matches)
        for (const result of filteredResults.slice(0, 3)) {
          if (result.writers && result.writers !== '-') {
            matchedWriters.push(...result.writers.split(',').map(w => w.trim()));
          }
          // Extract detailed writer info with IPI numbers
          if (result.writers_detail && Array.isArray(result.writers_detail)) {
            for (const wd of result.writers_detail) {
              if (wd.name && !matchedWritersDetail.some(w => w.name === wd.name && w.ipi === wd.ipi)) {
                matchedWritersDetail.push({
                  name: wd.name,
                  affiliation: wd.affiliation || '',
                  ipi: wd.ipi || ''
                });
              }
            }
          }
          if (result.publishers && result.publishers !== '-') {
            matchedPublishers.push(...result.publishers.split(',').map(p => p.trim()));
          }
          // Extract detailed publisher info with IPI numbers
          if (result.publishers_detail && Array.isArray(result.publishers_detail)) {
            for (const pd of result.publishers_detail) {
              if (pd.name && !matchedPublishersDetail.some(p => p.name === pd.name && p.ipi === pd.ipi)) {
                matchedPublishersDetail.push({
                  name: pd.name,
                  affiliation: pd.affiliation || '',
                  ipi: pd.ipi || ''
                });
              }
            }
          }
          // Extract ISWC from matched PRO results (from BMI Songview expanded detail)
          if (result.iswc && result.iswc !== '-' && result.iswc !== '') {
            matchedIswcs.push(result.iswc);
            console.log(`[LeakScanner] Found ISWC from matched PRO result: ${result.iswc}`);
          }
          console.log(`[LeakScanner] Matched PRO result (score: ${result.matchScore}): "${result.title}" by ${result.performers}${result.iswc ? ` [ISWC: ${result.iswc}]` : ''}`);
        }

        sources.songview = {
          found: true,
          results: filteredResults.slice(0, 5), // Keep top 5 matches
          writerCount: [...new Set(matchedWriters)].length,
          publisherCount: [...new Set(matchedPublishers)].length,
          iswcCount: [...new Set(matchedIswcs)].length
        };

        // PRO writers from MATCHED results are the GOLD STANDARD
        const uniqueMatchedWriters = [...new Set(matchedWriters)];
        if (uniqueMatchedWriters.length > 0) {
          foundData.writers.push(...uniqueMatchedWriters);
          console.log(`[LeakScanner] Found ${uniqueMatchedWriters.length} writers from matched PRO results: ${uniqueMatchedWriters.slice(0, 3).join(', ')}`);
        }

        // Detailed writer info with IPI numbers
        if (matchedWritersDetail.length > 0) {
          foundData.writersDetail.push(...matchedWritersDetail);
          console.log(`[LeakScanner] Found ${matchedWritersDetail.length} writers with IPI details`);
        }

        // PRO publishers from MATCHED results
        const uniqueMatchedPublishers = [...new Set(matchedPublishers)];
        if (uniqueMatchedPublishers.length > 0) {
          foundData.publishers.push(...uniqueMatchedPublishers);
          console.log(`[LeakScanner] Found ${uniqueMatchedPublishers.length} publishers from matched PRO results`);
        }

        // Detailed publisher info with IPI numbers
        if (matchedPublishersDetail.length > 0) {
          foundData.publishersDetail.push(...matchedPublishersDetail);
          console.log(`[LeakScanner] Found ${matchedPublishersDetail.length} publishers with IPI details`);
        }

        // PRO ISWCs from MATCHED results - CRITICAL for metadata completeness!
        const uniqueMatchedIswcs = [...new Set(matchedIswcs)];
        if (uniqueMatchedIswcs.length > 0) {
          foundData.iswcs.push(...uniqueMatchedIswcs);
          console.log(`[LeakScanner] Found ${uniqueMatchedIswcs.length} ISWC(s) from matched PRO results: ${uniqueMatchedIswcs.join(', ')}`);
        }
      } else {
        // No results matched our cross-source criteria
        console.log(`[LeakScanner] No PRO results matched cross-source criteria - track may not be registered`);
        sources.songview = {
          found: false,
          results: [], // Include empty for transparency
          writerCount: 0,
          publisherCount: 0
        };
      }
    } else {
      sources.songview = { found: false };
    }
  } catch (error) {
    console.error('[LeakScanner] PRO database search error:', error);
    sources.songview = { found: false };
  }

  // =========================================================================
  // DEDUPLICATE AND CLEAN FOUND DATA
  // =========================================================================
  foundData.isrcs = [...new Set(foundData.isrcs)];
  foundData.iswcs = [...new Set(foundData.iswcs)];
  foundData.artists = [...new Set(foundData.artists)];
  foundData.writers = [...new Set(foundData.writers)];
  foundData.publishers = [...new Set(foundData.publishers.filter(p => p && p.length > 0))];
  foundData.titleVariations = [...new Set(foundData.titleVariations)];
  foundData.releaseDates = [...new Set(foundData.releaseDates)].sort();

  // Log summary of what we found
  console.log(`[LeakScanner] Search complete for "${song.title}":`, {
    isrcsFound: foundData.isrcs.length,
    iswcsFound: foundData.iswcs.length,
    writersFound: foundData.writers.length,
    sourcesFound: Object.values(sources).filter((s: any) => s?.found).length
  });

  // =========================================================================
  // SCORING LOGIC - Based on what we FOUND from databases
  // =========================================================================

  // Count how many sources found the track
  const sourcesFound = Object.values(sources).filter((s: any) => s?.found).length;

  // ISRC check - Now considers both user input AND discovered ISRCs
  const hasIsrc = song.isrc || foundData.isrcs.length > 0;
  if (!hasIsrc) {
    const issue = ISSUE_DEFINITIONS.MISSING_ISRC;
    issues.push({
      ...issue,
      description: `${issue.description}. We searched Spotify, MusicBrainz, and Discogs but couldn't find an ISRC for this track.`
    });
    score -= issue.deduction;
  }

  // ISWC check - Only penalize if we searched databases and still couldn't find it
  const hasIswc = song.iswc || foundData.iswcs.length > 0;
  if (!hasIswc && sourcesFound > 0) {
    // Track exists in databases but has no ISWC registered
    const issue = ISSUE_DEFINITIONS.MISSING_ISWC;
    issues.push({
      ...issue,
      description: `${issue.description}. Track found in ${sourcesFound} source(s) but no ISWC registered yet.`
    });
    score -= issue.deduction;
  } else if (!hasIswc && sourcesFound === 0) {
    // Track not found anywhere - might be too new or metadata is wrong
    const issue = ISSUE_DEFINITIONS.MISSING_ISWC;
    issues.push({
      ...issue,
      description: 'Track not found in any database - may be too new or search criteria need adjustment.',
      deduction: 15 // Lower penalty since we couldn't verify
    });
    score -= 15;
  }

  // Publisher check
  const hasPublisher = song.publisher || foundData.publishers.length > 0;
  if (!hasPublisher) {
    const issue = ISSUE_DEFINITIONS.MISSING_PUBLISHER;
    issues.push(issue);
    score -= issue.deduction;
  }

  // PRO Registration check - Track not found in BMI/ASCAP Songview
  const proFound = sources.songview?.found;
  if (!proFound && sourcesFound > 0) {
    // Track found in streaming/database sources but NOT in PRO database
    const issue = ISSUE_DEFINITIONS.NO_PRO_REGISTRATION;
    issues.push({
      ...issue,
      description: `${issue.description}. Track found on Spotify/MusicBrainz but not in BMI/ASCAP Songview. Register to receive performance royalties.`
    });
    score -= issue.deduction;
  }

  // Writer check - enhanced with mismatch detection
  if (song.writer && song.writer.trim()) {
    // User provided a writer - check if it matches database
    if (foundData.writers.length > 0) {
      // Writers found in database - check for match
      if (!writerMatches(song.writer, foundData.writers)) {
        const issue = ISSUE_DEFINITIONS.WRITER_MISMATCH;
        issues.push({
          ...issue,
          description: `${issue.description}. Your records show "${song.writer}" but databases show: ${foundData.writers.slice(0, 3).join(', ')}`
        });
        score -= issue.deduction;
      }
    } else if (sourcesFound > 0) {
      // Track found but writer not registered
      const issue = ISSUE_DEFINITIONS.WRITER_NOT_REGISTERED;
      issues.push({
        ...issue,
        description: `Your writer credit "${song.writer}" not found in any database. Register with your PRO.`
      });
      score -= issue.deduction;
    }
  } else if (foundData.writers.length === 0 && sourcesFound > 0) {
    // Track found but no writer credits anywhere
    const issue = ISSUE_DEFINITIONS.MISSING_WRITER;
    issues.push(issue);
    score -= issue.deduction;
  }

  // Release date check
  const hasReleaseDate = song.releaseDate || foundData.releaseDates.length > 0;
  if (!hasReleaseDate) {
    const issue = ISSUE_DEFINITIONS.MISSING_RELEASE_DATE;
    issues.push(issue);
    score -= issue.deduction;
  }

  // Title mismatch check
  if (foundData.titleVariations.length > 0) {
    const issue = ISSUE_DEFINITIONS.TITLE_MISMATCH;
    issues.push(issue);
    score -= issue.deduction;
  }

  // NOTE: PRO registration is already checked above at lines 1088-1098
  // Do NOT add duplicate NO_PRO_REGISTRATION check based on MusicBrainz
  // MusicBrainz is a metadata database, not a PRO (Performance Rights Organization)

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    song,
    score,
    grade: calculateGrade(score),
    issues,
    sources,
    foundData,
    scannedAt: new Date().toISOString()
  };
}

/**
 * Scan a catalog of songs
 */
export async function scanCatalog(
  songs: SongInput[],
  progressCallback?: (current: number, total: number) => void
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const total = songs.length;

  for (let i = 0; i < songs.length; i++) {
    if (progressCallback) {
      progressCallback(i + 1, total);
    }

    const result = await calculateMetadataScore(songs[i]);
    results.push(result);

    // Small delay between songs to be nice to APIs
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Scan a placement from the database with enhanced writer credit analysis
 * Includes split conflict detection and PRO verification
 */
export async function scanPlacement(placement: PlacementInput): Promise<ScanResult> {
  // Convert placement to SongInput format
  const writers = placement.credits.map(c => `${c.firstName} ${c.lastName}`);
  const primaryWriter = placement.credits.find(c => c.isPrimary) || placement.credits[0];

  const song: SongInput = {
    title: placement.title,
    artist: placement.artist,
    writer: primaryWriter ? `${primaryWriter.firstName} ${primaryWriter.lastName}` : undefined,
    isrc: placement.isrc || undefined,
    releaseDate: placement.releaseDate?.toISOString().split('T')[0]
  };

  // Get base scan result from metadata score
  const baseResult = await calculateMetadataScore(song);

  // Add placement-specific issues
  const additionalIssues: ScanResult['issues'] = [];
  let additionalDeductions = 0;

  // Check split totals
  const totalSplit = placement.credits.reduce((sum, c) => {
    const split = typeof c.splitPercentage === 'object'
      ? Number(c.splitPercentage)
      : Number(c.splitPercentage);
    return sum + split;
  }, 0);

  if (totalSplit < 99.9 && totalSplit > 0) {
    const issue = ISSUE_DEFINITIONS.SPLITS_NOT_100;
    additionalIssues.push({
      ...issue,
      description: `${issue.description} (Current total: ${totalSplit.toFixed(1)}%)`
    });
    additionalDeductions += issue.deduction;
  } else if (totalSplit > 100.1) {
    const issue = ISSUE_DEFINITIONS.SPLITS_OVER_100;
    additionalIssues.push({
      ...issue,
      description: `${issue.description} (Current total: ${totalSplit.toFixed(1)}%)`
    });
    additionalDeductions += issue.deduction;
  }

  // Check for missing PRO affiliations
  const creditsWithoutPro = placement.credits.filter(c => !c.pro);
  if (creditsWithoutPro.length > 0) {
    const issue = ISSUE_DEFINITIONS.NO_PRO_ON_CREDIT;
    additionalIssues.push({
      ...issue,
      description: `${creditsWithoutPro.length} writer(s) missing PRO affiliation: ${creditsWithoutPro.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`
    });
    additionalDeductions += issue.deduction;
  }

  // Check for missing IPI numbers
  const creditsWithoutIpi = placement.credits.filter(c => !c.ipiNumber);
  if (creditsWithoutIpi.length > 0) {
    const issue = ISSUE_DEFINITIONS.MISSING_IPI;
    additionalIssues.push({
      ...issue,
      description: `${creditsWithoutIpi.length} writer(s) missing IPI number: ${creditsWithoutIpi.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`
    });
    additionalDeductions += issue.deduction;
  }

  // Check for multiple PROs (not necessarily an issue, but good to flag)
  const pros = [...new Set(placement.credits.filter(c => c.pro).map(c => c.pro))];
  if (pros.length > 1) {
    const issue = ISSUE_DEFINITIONS.MULTIPLE_PROS_SAME_WORK;
    additionalIssues.push({
      ...issue,
      description: `Writers registered with multiple PROs: ${pros.join(', ')}`
    });
    additionalDeductions += issue.deduction;
  }

  // Add all registered writers to foundData for comparison
  const enhancedFoundData = {
    ...baseResult.foundData,
    writers: [...new Set([...baseResult.foundData.writers, ...writers])],
    // Add user-provided data
    userWriters: writers,
    userSplits: placement.credits.map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      split: Number(c.splitPercentage),
      pro: c.pro,
      ipi: c.ipiNumber
    }))
  };

  // Calculate final score
  const finalScore = Math.max(0, baseResult.score - additionalDeductions);

  return {
    ...baseResult,
    song: {
      ...song,
      // Include placement ID for reference
      title: `${song.title} (${placement.id.slice(-6)})`
    },
    score: finalScore,
    grade: calculateGrade(finalScore),
    issues: [...baseResult.issues, ...additionalIssues],
    foundData: enhancedFoundData as any
  };
}

/**
 * Generate a summary report from scan results
 */
export function generateSummary(results: ScanResult[]): {
  totalSongs: number;
  averageScore: number;
  gradeDistribution: Record<Grade, number>;
  topIssues: Array<{ code: string; count: number; description: string }>;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
} {
  const gradeDistribution: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const issueCounts: Record<string, number> = {};
  let totalScore = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const result of results) {
    totalScore += result.score;
    gradeDistribution[result.grade]++;

    for (const issue of result.issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] || 0) + 1;

      switch (issue.severity) {
        case 'critical': criticalCount++; break;
        case 'high': highCount++; break;
        case 'medium': mediumCount++; break;
        case 'low': lowCount++; break;
      }
    }
  }

  const topIssues = Object.entries(issueCounts)
    .map(([code, count]) => ({
      code,
      count,
      description: ISSUE_DEFINITIONS[code]?.description || code
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSongs: results.length,
    averageScore: results.length > 0 ? Math.round(totalScore / results.length) : 0,
    gradeDistribution,
    topIssues,
    criticalCount,
    highCount,
    mediumCount,
    lowCount
  };
}

/**
 * Parse CSV content into song objects
 */
export function parseCsvCatalog(csvContent: string): SongInput[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header row - normalize column names
  const headers = lines[0].split(',').map(h =>
    h.trim().toLowerCase().replace(/["']/g, '')
  );

  // Map common column name variations
  const columnMap: Record<string, keyof SongInput> = {
    'title': 'title',
    'song_title': 'title',
    'song': 'title',
    'track': 'title',
    'track_title': 'title',
    'artist': 'artist',
    'performer': 'artist',
    'recording_artist': 'artist',
    'writer': 'writer',
    'songwriter': 'writer',
    'composer': 'writer',
    'writers': 'writer',
    'isrc': 'isrc',
    'isrc_code': 'isrc',
    'iswc': 'iswc',
    'iswc_code': 'iswc',
    'publisher': 'publisher',
    'publisher_name': 'publisher',
    'pub': 'publisher',
    'release_date': 'releaseDate',
    'release': 'releaseDate',
    'date': 'releaseDate'
  };

  // Find column indices
  const columnIndices: Partial<Record<keyof SongInput, number>> = {};
  headers.forEach((header, index) => {
    const field = columnMap[header];
    if (field) {
      columnIndices[field] = index;
    }
  });

  if (columnIndices.title === undefined) {
    throw new Error('CSV must have a "title" column');
  }

  // Parse data rows
  const songs: SongInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values with commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Build song object
    const song: SongInput = {
      title: values[columnIndices.title!] || ''
    };

    if (columnIndices.artist !== undefined) {
      song.artist = values[columnIndices.artist] || undefined;
    }
    if (columnIndices.writer !== undefined) {
      song.writer = values[columnIndices.writer] || undefined;
    }
    if (columnIndices.isrc !== undefined) {
      song.isrc = values[columnIndices.isrc] || undefined;
    }
    if (columnIndices.iswc !== undefined) {
      song.iswc = values[columnIndices.iswc] || undefined;
    }
    if (columnIndices.publisher !== undefined) {
      song.publisher = values[columnIndices.publisher] || undefined;
    }
    if (columnIndices.releaseDate !== undefined) {
      song.releaseDate = values[columnIndices.releaseDate] || undefined;
    }

    if (song.title) {
      songs.push(song);
    }
  }

  return songs;
}

/**
 * Store scan results in database
 */
export async function storeScanResults(
  userId: string,
  catalogName: string,
  results: ScanResult[]
): Promise<string> {
  // Store as JSON in a dedicated table or as a document
  // For now, we'll use a simple approach with a generated ID
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // In a real implementation, you'd store this in a database table
  // For now, we'll cache it in memory (not production-ready)
  scanResultsCache.set(scanId, {
    userId,
    catalogName,
    results,
    summary: generateSummary(results),
    createdAt: new Date().toISOString()
  });

  return scanId;
}

// In-memory cache for scan results (replace with database in production)
const scanResultsCache = new Map<string, {
  userId: string;
  catalogName: string;
  results: ScanResult[];
  summary: ReturnType<typeof generateSummary>;
  createdAt: string;
}>();

/**
 * Get cached scan results
 */
export function getScanResults(scanId: string): {
  results: ScanResult[];
  summary: ReturnType<typeof generateSummary>;
  catalogName: string;
  createdAt: string;
} | null {
  const cached = scanResultsCache.get(scanId);
  if (!cached) return null;

  return {
    results: cached.results,
    summary: cached.summary,
    catalogName: cached.catalogName,
    createdAt: cached.createdAt
  };
}

/**
 * Get issue definitions for display
 */
export function getIssueDefinitions(): Record<string, IssueDefinition> {
  return ISSUE_DEFINITIONS;
}
