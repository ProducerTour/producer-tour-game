/**
 * AI Routes
 * Handles AI-powered features for Legal AI Tool, contract analysis, and document generation
 */

import { Router, Request, Response } from 'express';
import { openaiService } from '../services/openai.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * GET /api/ai/status
 * Check if AI service is enabled
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    enabled: openaiService.isEnabled(),
    features: openaiService.isEnabled()
      ? ['contract-analysis', 'contract-generation', 'legal-terms', 'contract-comparison', 'legal-chat']
      : [],
  });
});

/**
 * POST /api/ai/analyze-contract
 * Analyze a music contract and extract key information
 */
router.post('/analyze-contract', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const { contractText } = req.body;

    if (!contractText || typeof contractText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Contract text is required',
      });
    }

    if (contractText.length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Contract text is too short. Please provide the full contract.',
      });
    }

    const analysis = await openaiService.analyzeContract(contractText);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Contract analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze contract',
    });
  }
});

/**
 * POST /api/ai/generate-contract
 * Generate a music contract based on deal terms
 */
router.post('/generate-contract', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const {
      dealType,
      clientName,
      clientPKA,
      artistName,
      songTitle,
      labelName,
      advance,
      masterRoyalty,
      publishingPercent,
      soundExchangeLOD,
      additionalTerms,
    } = req.body;

    // Validate required fields
    if (!dealType || !clientName || !artistName || !songTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dealType, clientName, artistName, and songTitle are required',
      });
    }

    const validDealTypes = ['producer_agreement', 'sync_license', 'work_for_hire', 'split_sheet', 'beat_lease'];
    if (!validDealTypes.includes(dealType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid deal type. Must be one of: ${validDealTypes.join(', ')}`,
      });
    }

    const contract = await openaiService.generateContract({
      dealType,
      clientName,
      clientPKA,
      artistName,
      songTitle,
      labelName,
      advance,
      masterRoyalty,
      publishingPercent,
      soundExchangeLOD,
      additionalTerms,
    });

    res.json({
      success: true,
      contract,
    });
  } catch (error) {
    console.error('Contract generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate contract',
    });
  }
});

/**
 * POST /api/ai/explain-terms
 * Explain legal terms in plain English
 */
router.post('/explain-terms', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const { terms } = req.body;

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Terms array is required',
      });
    }

    if (terms.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 terms at a time',
      });
    }

    const explanations = await openaiService.explainLegalTerms(terms);

    res.json({
      success: true,
      explanations,
    });
  } catch (error) {
    console.error('Term explanation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to explain terms',
    });
  }
});

/**
 * POST /api/ai/compare-contracts
 * Compare two contract versions and identify changes
 */
router.post('/compare-contracts', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const { originalText, revisedText } = req.body;

    if (!originalText || !revisedText) {
      return res.status(400).json({
        success: false,
        error: 'Both originalText and revisedText are required',
      });
    }

    const comparison = await openaiService.compareContracts(originalText, revisedText);

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error('Contract comparison error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare contracts',
    });
  }
});

/**
 * POST /api/ai/chat
 * Chat with AI about legal/contract questions
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const response = await openaiService.legalChat(message, conversationHistory || []);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat',
    });
  }
});

export default router;
