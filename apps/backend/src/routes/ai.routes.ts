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
      ? ['contract-analysis', 'contract-generation', 'legal-terms', 'contract-comparison', 'legal-chat', 'quest-advisor']
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

/**
 * POST /api/ai/explain-quest-step
 * Get AI explanation for a quest step in context of music business formation
 */
router.post('/explain-quest-step', async (req: Request, res: Response) => {
  console.log('[explain-quest-step] ====== REQUEST RECEIVED ======');
  console.log('[explain-quest-step] Request body:', JSON.stringify(req.body, null, 2));

  try {
    if (!openaiService.isEnabled()) {
      console.log('[explain-quest-step] ERROR: AI service not enabled');
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }
    console.log('[explain-quest-step] AI service is enabled');

    const {
      stepTitle,
      stepDescription,
      actionType,
      questTitle,
      questCategory,
      entityName,
      entityType,
      jurisdiction,
      actionData,
    } = req.body;

    // Validate required fields
    if (!stepTitle || !stepDescription || !questTitle || !entityName) {
      console.log('[explain-quest-step] ERROR: Missing required fields', { stepTitle, stepDescription, questTitle, entityName });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: stepTitle, stepDescription, questTitle, and entityName are required',
      });
    }

    console.log('[explain-quest-step] Calling openaiService.explainQuestStep...');
    const startTime = Date.now();

    const explanation = await openaiService.explainQuestStep({
      stepTitle,
      stepDescription,
      actionType: actionType || 'INFO',
      questTitle,
      questCategory: questCategory || 'FORMATION',
      entityName,
      entityType: entityType || 'LLC',
      jurisdiction: jurisdiction || 'Delaware',
      actionData,
    });

    const duration = Date.now() - startTime;
    console.log(`[explain-quest-step] OpenAI response received in ${duration}ms`);
    console.log('[explain-quest-step] Explanation keys:', Object.keys(explanation || {}));

    const responsePayload = {
      success: true,
      explanation,
    };
    console.log('[explain-quest-step] Sending response:', JSON.stringify(responsePayload, null, 2).substring(0, 500) + '...');

    res.json(responsePayload);
  } catch (error) {
    console.error('[explain-quest-step] ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to explain quest step',
    });
  }
});

/**
 * POST /api/ai/analyze-selfie
 * Analyze a selfie image and extract facial features for avatar generation
 */
router.post('/analyze-selfie', async (req: Request, res: Response) => {
  try {
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Set OPENAI_API_KEY to enable.',
      });
    }

    const { imageData } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 string)',
      });
    }

    // Basic validation - check if it looks like base64 or data URL
    const isDataUrl = imageData.startsWith('data:image/');
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(imageData.replace(/\s/g, ''));

    if (!isDataUrl && !isBase64) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image data format. Expected base64 string or data URL.',
      });
    }

    // Check approximate file size (base64 is ~4/3 of original)
    const estimatedSize = (imageData.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    if (estimatedSize > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'Image too large. Maximum size is 10MB.',
      });
    }

    console.log('[analyze-selfie] Analyzing selfie image...');
    const startTime = Date.now();

    const analysis = await openaiService.analyzeSelfie(imageData);

    const duration = Date.now() - startTime;
    console.log(`[analyze-selfie] Analysis complete in ${duration}ms, confidence: ${analysis.confidence}`);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('[analyze-selfie] ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze selfie',
    });
  }
});

export default router;
