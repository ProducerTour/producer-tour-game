import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * Calculate advance estimate based on parameters
 * This is a helper function that implements the advance calculation logic
 */
function calculateAdvance(params: {
  catalogSize: number;
  monthlyRoyalties: number;
  contractLength: number; // in months
  artistIncome: number; // percentage 0-100
  includeNewReleases: boolean;
  switchDistributors: boolean;
}) {
  const {
    catalogSize,
    monthlyRoyalties,
    contractLength,
    artistIncome,
    includeNewReleases,
    switchDistributors,
  } = params;

  // Calculate projected total royalties over contract period
  const projectedTotal = monthlyRoyalties * contractLength;

  // Base recoupment rate (what % of future royalties goes to repaying advance)
  // Lower artist income during term = higher recoupment rate
  const baseRecoupmentRate = 100 - artistIncome;

  // Adjust recoupment based on contract length (longer = lower rate)
  const lengthMultiplier = contractLength <= 12 ? 0.9 : contractLength <= 24 ? 0.85 : contractLength <= 36 ? 0.8 : 0.75;
  const recoupmentRate = Math.round(baseRecoupmentRate * lengthMultiplier);

  // Calculate upfront advance
  // Formula: 40-60% of projected royalties depending on catalog size and recoupment
  const catalogMultiplier = catalogSize < 10 ? 0.4 : catalogSize < 50 ? 0.45 : catalogSize < 100 ? 0.5 : 0.55;
  const recoupMultiplier = recoupmentRate / 100;
  const upfrontAdvance = Math.round(projectedTotal * catalogMultiplier * recoupMultiplier);

  // New release advance (if including future releases)
  let newReleaseAdvance = null;
  if (includeNewReleases) {
    // Estimate based on monthly royalties and contract length
    const newReleaseMultiplier = 0.15; // 15% of projected total for new releases
    newReleaseAdvance = Math.round(projectedTotal * newReleaseMultiplier);
  }

  // Option advance (if willing to switch distributors)
  let optionAdvance = null;
  if (switchDistributors) {
    // Additional 10-15% for distributor flexibility
    const optionMultiplier = 0.12;
    optionAdvance = Math.round(upfrontAdvance * optionMultiplier);
  }

  // Calculate estimated total
  const estimatedTotal = upfrontAdvance + (newReleaseAdvance || 0) + (optionAdvance || 0);

  return {
    upfrontAdvance,
    newReleaseAdvance,
    optionAdvance,
    recoupmentRate,
    estimatedTotal,
  };
}

/**
 * GET /api/advance-scenarios
 * Get all advance scenarios for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scenarios = await prisma.advanceScenario.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: scenarios.length,
      scenarios,
    });
  } catch (error) {
    console.error('Get advance scenarios error:', error);
    res.status(500).json({ error: 'Failed to fetch advance scenarios' });
  }
});

/**
 * GET /api/advance-scenarios/:id
 * Get a specific advance scenario by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scenario = await prisma.advanceScenario.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Advance scenario not found' });
    }

    res.json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error('Get advance scenario error:', error);
    res.status(500).json({ error: 'Failed to fetch advance scenario' });
  }
});

/**
 * POST /api/advance-scenarios/calculate
 * Calculate advance estimate without saving
 * Body: { catalogSize, monthlyRoyalties, contractLength, artistIncome, includeNewReleases, switchDistributors }
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      catalogSize,
      monthlyRoyalties,
      contractLength,
      artistIncome,
      includeNewReleases = false,
      switchDistributors = false,
    } = req.body;

    // Validation
    if (
      catalogSize === undefined ||
      monthlyRoyalties === undefined ||
      contractLength === undefined ||
      artistIncome === undefined
    ) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (catalogSize < 0 || monthlyRoyalties < 0 || contractLength < 1 || contractLength > 120) {
      return res.status(400).json({ error: 'Invalid parameter values' });
    }

    if (artistIncome < 0 || artistIncome > 100) {
      return res.status(400).json({ error: 'Artist income must be between 0 and 100' });
    }

    const calculation = calculateAdvance({
      catalogSize: parseInt(catalogSize),
      monthlyRoyalties: parseFloat(monthlyRoyalties),
      contractLength: parseInt(contractLength),
      artistIncome: parseInt(artistIncome),
      includeNewReleases,
      switchDistributors,
    });

    res.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error('Calculate advance error:', error);
    res.status(500).json({ error: 'Failed to calculate advance' });
  }
});

/**
 * POST /api/advance-scenarios
 * Create and save a new advance scenario
 * Body: { scenarioName, catalogSize, monthlyRoyalties, contractLength, artistIncome, includeNewReleases, switchDistributors, notes? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      scenarioName,
      catalogSize,
      monthlyRoyalties,
      contractLength,
      artistIncome,
      includeNewReleases = false,
      switchDistributors = false,
      notes,
    } = req.body;

    // Validation
    if (!scenarioName || catalogSize === undefined || monthlyRoyalties === undefined || contractLength === undefined || artistIncome === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Calculate the advance
    const calculation = calculateAdvance({
      catalogSize: parseInt(catalogSize),
      monthlyRoyalties: parseFloat(monthlyRoyalties),
      contractLength: parseInt(contractLength),
      artistIncome: parseInt(artistIncome),
      includeNewReleases,
      switchDistributors,
    });

    // Save to database
    const scenario = await prisma.advanceScenario.create({
      data: {
        userId,
        scenarioName,
        catalogSize: parseInt(catalogSize),
        monthlyRoyalties: parseFloat(monthlyRoyalties),
        contractLength: parseInt(contractLength),
        artistIncome: parseInt(artistIncome),
        includeNewReleases,
        switchDistributors,
        upfrontAdvance: calculation.upfrontAdvance,
        newReleaseAdvance: calculation.newReleaseAdvance,
        optionAdvance: calculation.optionAdvance,
        recoupmentRate: calculation.recoupmentRate,
        estimatedTotal: calculation.estimatedTotal,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error('Create advance scenario error:', error);
    res.status(500).json({ error: 'Failed to create advance scenario' });
  }
});

/**
 * PUT /api/advance-scenarios/:id
 * Update an advance scenario
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.advanceScenario.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Advance scenario not found' });
    }

    const {
      scenarioName,
      catalogSize,
      monthlyRoyalties,
      contractLength,
      artistIncome,
      includeNewReleases,
      switchDistributors,
      notes,
    } = req.body;

    // Recalculate if parameters changed
    let calculation;
    if (
      catalogSize !== undefined ||
      monthlyRoyalties !== undefined ||
      contractLength !== undefined ||
      artistIncome !== undefined ||
      includeNewReleases !== undefined ||
      switchDistributors !== undefined
    ) {
      calculation = calculateAdvance({
        catalogSize: catalogSize !== undefined ? parseInt(catalogSize) : existing.catalogSize,
        monthlyRoyalties: monthlyRoyalties !== undefined ? parseFloat(monthlyRoyalties) : parseFloat(existing.monthlyRoyalties.toString()),
        contractLength: contractLength !== undefined ? parseInt(contractLength) : existing.contractLength,
        artistIncome: artistIncome !== undefined ? parseInt(artistIncome) : existing.artistIncome,
        includeNewReleases: includeNewReleases !== undefined ? includeNewReleases : existing.includeNewReleases,
        switchDistributors: switchDistributors !== undefined ? switchDistributors : existing.switchDistributors,
      });
    }

    const scenario = await prisma.advanceScenario.update({
      where: { id },
      data: {
        ...(scenarioName && { scenarioName }),
        ...(catalogSize !== undefined && { catalogSize: parseInt(catalogSize) }),
        ...(monthlyRoyalties !== undefined && { monthlyRoyalties: parseFloat(monthlyRoyalties) }),
        ...(contractLength !== undefined && { contractLength: parseInt(contractLength) }),
        ...(artistIncome !== undefined && { artistIncome: parseInt(artistIncome) }),
        ...(includeNewReleases !== undefined && { includeNewReleases }),
        ...(switchDistributors !== undefined && { switchDistributors }),
        ...(notes !== undefined && { notes }),
        ...(calculation && {
          upfrontAdvance: calculation.upfrontAdvance,
          newReleaseAdvance: calculation.newReleaseAdvance,
          optionAdvance: calculation.optionAdvance,
          recoupmentRate: calculation.recoupmentRate,
          estimatedTotal: calculation.estimatedTotal,
        }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error('Update advance scenario error:', error);
    res.status(500).json({ error: 'Failed to update advance scenario' });
  }
});

/**
 * DELETE /api/advance-scenarios/:id
 * Delete an advance scenario
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.advanceScenario.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Advance scenario not found' });
    }

    await prisma.advanceScenario.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Advance scenario deleted successfully',
    });
  } catch (error) {
    console.error('Delete advance scenario error:', error);
    res.status(500).json({ error: 'Failed to delete advance scenario' });
  }
});

export default router;
