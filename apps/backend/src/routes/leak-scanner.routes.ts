/**
 * Leak Scanner API Routes
 *
 * Endpoints for scanning music catalogs to detect metadata issues
 * and generate FICO-style scores for each song.
 */

import { Router, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import {
  calculateMetadataScore,
  scanCatalog,
  scanPlacement,
  parseCsvCatalog,
  storeScanResults,
  getScanResults,
  generateSummary,
  getIssueDefinitions,
  SongInput
} from '../services/leak-scanner.service';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/leak-scanner/single
 * Score a single song without uploading a catalog
 */
router.post('/single', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, artist, writer, isrc, iswc, publisher, releaseDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Song title is required'
      });
    }

    const song: SongInput = {
      title,
      artist,
      writer,
      isrc,
      iswc,
      publisher,
      releaseDate
    };

    const result = await calculateMetadataScore(song);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Single song scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan song'
    });
  }
});

/**
 * GET /api/leak-scanner/placements
 * Get user's placements that can be scanned
 */
router.get('/placements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { userId: req.user!.id },
      include: {
        credits: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to scan-ready format
    const placementsForScan = placements.map(p => ({
      id: p.id,
      title: p.title,
      artist: p.artist,
      isrc: p.isrc,
      spotifyTrackId: p.spotifyTrackId,
      releaseDate: p.releaseDate?.toISOString().split('T')[0],
      musicbrainzId: p.musicbrainzId,
      status: p.status,
      // Extract writer info from credits
      writers: p.credits.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        role: c.role,
        split: Number(c.splitPercentage),
        pro: c.pro,
        ipiNumber: c.ipiNumber
      })),
      // Primary writer (first producer/writer credit)
      primaryWriter: p.credits.find(c => c.isPrimary)
        ? `${p.credits.find(c => c.isPrimary)!.firstName} ${p.credits.find(c => c.isPrimary)!.lastName}`
        : p.credits[0]
          ? `${p.credits[0].firstName} ${p.credits[0].lastName}`
          : undefined,
      totalSplit: p.credits.reduce((sum, c) => sum + Number(c.splitPercentage), 0)
    }));

    res.json({
      success: true,
      placements: placementsForScan,
      count: placementsForScan.length
    });
  } catch (error) {
    console.error('Get placements for scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch placements'
    });
  }
});

/**
 * POST /api/leak-scanner/placements/scan
 * Scan all or selected placements
 */
router.post('/placements/scan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { placementIds } = req.body;

    // Fetch placements (all or selected)
    const whereClause: any = { userId: req.user!.id };
    if (placementIds && Array.isArray(placementIds) && placementIds.length > 0) {
      whereClause.id = { in: placementIds };
    }

    const placements = await prisma.placement.findMany({
      where: whereClause,
      include: {
        credits: true
      },
      take: 50 // Limit to prevent timeout
    });

    if (placements.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No placements found to scan'
      });
    }

    // Scan each placement
    const results = [];
    for (const placement of placements) {
      const result = await scanPlacement(placement);
      results.push(result);

      // Rate limit for MusicBrainz
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    // Generate summary
    const summary = generateSummary(results);

    // Store results
    const scanId = await storeScanResults(req.user!.id, 'My Placements', results);

    res.json({
      success: true,
      scanId,
      totalScanned: results.length,
      summary,
      results
    });
  } catch (error) {
    console.error('Scan placements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan placements'
    });
  }
});

/**
 * POST /api/leak-scanner/placements/:placementId/scan
 * Scan a single placement
 */
router.post('/placements/:placementId/scan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { placementId } = req.params;

    const placement = await prisma.placement.findFirst({
      where: {
        id: placementId,
        userId: req.user!.id
      },
      include: {
        credits: true
      }
    });

    if (!placement) {
      return res.status(404).json({
        success: false,
        error: 'Placement not found'
      });
    }

    const result = await scanPlacement(placement);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Scan single placement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan placement'
    });
  }
});

/**
 * POST /api/leak-scanner/upload
 * Upload a catalog file (CSV) for scanning
 */
router.post('/upload', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !req.files.catalog) {
      return res.status(400).json({
        success: false,
        error: 'No catalog file uploaded'
      });
    }

    const file = req.files.catalog as UploadedFile;

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const allowedExtensions = ['.csv', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload a CSV file.'
      });
    }

    // Parse the CSV file
    const csvContent = file.data.toString('utf-8');
    let songs: SongInput[];

    try {
      songs = parseCsvCatalog(csvContent);
    } catch (parseError: any) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse CSV: ${parseError.message}`
      });
    }

    if (songs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid songs found in the catalog'
      });
    }

    // For large catalogs, just store the parsed songs and return immediately
    // The actual scan will be triggered separately
    const catalogName = file.name.replace(/\.[^/.]+$/, '');
    const scanId = await storeScanResults(req.user!.id, catalogName, []);

    res.json({
      success: true,
      scanId,
      catalogName,
      songCount: songs.length,
      preview: songs.slice(0, 5),
      message: `Catalog uploaded with ${songs.length} songs. Call /api/leak-scanner/${scanId}/scan to begin scanning.`
    });

    // Store the parsed songs for later scanning
    pendingScans.set(scanId, {
      userId: req.user!.id,
      catalogName,
      songs
    });

  } catch (error) {
    console.error('Catalog upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload catalog'
    });
  }
});

// In-memory store for pending scans
const pendingScans = new Map<string, {
  userId: string;
  catalogName: string;
  songs: SongInput[];
}>();

/**
 * POST /api/leak-scanner/:scanId/scan
 * Run the full scan on an uploaded catalog
 */
router.post('/:scanId/scan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { scanId } = req.params;
    const pending = pendingScans.get(scanId);

    if (!pending) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found or already completed'
      });
    }

    if (pending.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this scan'
      });
    }

    const { songs, catalogName } = pending;

    // Limit to prevent timeout (scan up to 50 songs at a time)
    const maxSongs = parseInt(req.query.limit as string) || 50;
    const songsToScan = songs.slice(0, maxSongs);

    // Run the scan
    const results = await scanCatalog(songsToScan);

    // Store the results
    await storeScanResults(req.user!.id, catalogName, results);

    // Clean up pending scan
    pendingScans.delete(scanId);

    // Generate summary
    const summary = generateSummary(results);

    res.json({
      success: true,
      scanId,
      catalogName,
      totalScanned: results.length,
      summary,
      results
    });

  } catch (error) {
    console.error('Catalog scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan catalog'
    });
  }
});

/**
 * GET /api/leak-scanner/:scanId
 * Get results for a completed scan
 */
router.get('/:scanId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { scanId } = req.params;
    const cached = getScanResults(scanId);

    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }

    res.json({
      success: true,
      ...cached
    });

  } catch (error) {
    console.error('Get scan results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scan results'
    });
  }
});

/**
 * GET /api/leak-scanner/:scanId/report/:format
 * Generate and download a report in the specified format
 */
router.get('/:scanId/report/:format', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { scanId, format } = req.params;
    const cached = getScanResults(scanId);

    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }

    const { results, summary, catalogName } = cached;

    switch (format.toLowerCase()) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${catalogName}-leak-report.json"`);
        res.json({
          catalogName,
          generatedAt: new Date().toISOString(),
          summary,
          results
        });
        break;

      case 'csv':
        const csvRows = [
          ['Title', 'Artist', 'Score', 'Grade', 'Issues', 'ISRCs Found', 'ISWCs Found', 'Fix Instructions']
        ];

        for (const result of results) {
          csvRows.push([
            result.song.title,
            result.song.artist || '',
            result.score.toString(),
            result.grade,
            result.issues.map(i => i.code).join('; '),
            result.foundData.isrcs.join('; '),
            result.foundData.iswcs.join('; '),
            result.issues.map(i => i.fixInstructions).join(' | ')
          ]);
        }

        const csvContent = csvRows.map(row =>
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${catalogName}-leak-report.csv"`);
        res.send(csvContent);
        break;

      case 'html':
        const html = generateHtmlReport(catalogName, summary, results);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${catalogName}-leak-report.html"`);
        res.send(html);
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unsupported format: ${format}. Use json, csv, or html.`
        });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * GET /api/leak-scanner/issues/definitions
 * Get the list of all issue types and their definitions
 */
router.get('/issues/definitions', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    issues: getIssueDefinitions()
  });
});

/**
 * Generate an HTML report
 */
function generateHtmlReport(
  catalogName: string,
  summary: ReturnType<typeof generateSummary>,
  results: Awaited<ReturnType<typeof scanCatalog>>
): string {
  const gradeColors: Record<string, string> = {
    A: '#22c55e',
    B: '#84cc16',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444'
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leak Scanner Report - ${catalogName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f1f5f9; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .summary-value { font-size: 2.5rem; font-weight: 700; }
    .summary-label { color: #94a3b8; font-size: 0.875rem; }
    .song-list { display: flex; flex-direction: column; gap: 1rem; }
    .song-card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .song-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .song-title { font-weight: 600; font-size: 1.125rem; }
    .song-artist { color: #94a3b8; font-size: 0.875rem; }
    .grade-badge { display: inline-flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 50%; font-weight: 700; font-size: 1.25rem; }
    .score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid; }
    .issues-list { margin-top: 1rem; }
    .issue { background: #0f172a; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 4px solid; }
    .issue-critical { border-color: #ef4444; }
    .issue-high { border-color: #f97316; }
    .issue-medium { border-color: #eab308; }
    .issue-low { border-color: #22c55e; }
    .issue-title { font-weight: 600; font-size: 0.875rem; }
    .issue-fix { color: #94a3b8; font-size: 0.75rem; margin-top: 0.25rem; }
    .footer { margin-top: 3rem; text-align: center; color: #64748b; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Leak Scanner Report</h1>
    <p class="subtitle">${catalogName} • Generated ${new Date().toLocaleDateString()}</p>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${summary.totalSongs}</div>
        <div class="summary-label">Songs Scanned</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: ${gradeColors[Object.entries(summary.gradeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'C']}">${summary.averageScore}</div>
        <div class="summary-label">Average Score</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: #ef4444">${summary.criticalCount}</div>
        <div class="summary-label">Critical Issues</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: #f97316">${summary.highCount}</div>
        <div class="summary-label">High Priority Issues</div>
      </div>
    </div>

    <h2 style="margin-bottom: 1rem;">Song Details</h2>
    <div class="song-list">
      ${results.map(result => `
        <div class="song-card">
          <div class="song-header">
            <div>
              <div class="song-title">${result.song.title}</div>
              <div class="song-artist">${result.song.artist || 'Unknown Artist'}</div>
            </div>
            <div class="score-circle" style="border-color: ${gradeColors[result.grade]}; color: ${gradeColors[result.grade]}">
              <span style="font-size: 1.5rem; font-weight: 700;">${result.score}</span>
              <span style="font-size: 0.75rem;">${result.grade}</span>
            </div>
          </div>
          ${result.issues.length > 0 ? `
            <div class="issues-list">
              ${result.issues.map(issue => `
                <div class="issue issue-${issue.severity}">
                  <div class="issue-title">${issue.description}</div>
                  <div class="issue-fix">${issue.fixInstructions}</div>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color: #22c55e;">No issues found</p>'}
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>Generated by Producer Tour Leak Scanner</p>
      <p>© ${new Date().getFullYear()} Producer Tour</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default router;
