import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/tools/publishing-simulator
 * Calculate publishing deal scenarios
 */
router.post('/publishing-simulator', (req: Request, res: Response) => {
  try {
    const {
      dealType, // 'unpublished' | 'copublishing' | 'admin'
      grossIncome,
      writerOwnership = 100,
      adminFee = 0,
      publisherOverhead = 0,
      advance = 0,
      priorBalance = 0,
    } = req.body;

    let result: any = {};

    if (dealType === 'unpublished') {
      const writerShare = grossIncome * 0.5; // 50%
      const publisherShare = grossIncome * 0.5; // 50%
      const totalIncome = writerShare + publisherShare;
      const adminDeduction = totalIncome * (adminFee / 100);
      const netBeforeRecoup = totalIncome - adminDeduction;
      const recoupment = Math.min(netBeforeRecoup, priorBalance + advance);
      const finalPayout = netBeforeRecoup - recoupment;

      result = {
        dealType: 'Unpublished',
        grossIncome,
        writerShare,
        publisherShare,
        totalIncome,
        adminFee: adminDeduction,
        netBeforeRecoup,
        advance,
        priorBalance,
        recoupment,
        finalPayout,
      };
    } else if (dealType === 'copublishing') {
      const writerShare = grossIncome * 0.5;
      const publisherShare = grossIncome * 0.5;
      const writerOwnershipDecimal = writerOwnership / 100;
      const writerPublisherCut = publisherShare * writerOwnershipDecimal;
      const publisherCut = publisherShare * (1 - writerOwnershipDecimal);
      const adminDeduction = (writerShare + writerPublisherCut) * (adminFee / 100);
      const overheadDeduction = publisherCut * (publisherOverhead / 100);
      const netBeforeRecoup = writerShare + writerPublisherCut - adminDeduction;
      const recoupment = Math.min(netBeforeRecoup, priorBalance + advance);
      const finalPayout = netBeforeRecoup - recoupment;

      result = {
        dealType: 'Co-Publishing',
        grossIncome,
        writerShare,
        publisherShare,
        writerPublisherCut,
        publisherCut,
        adminFee: adminDeduction,
        publisherOverhead: overheadDeduction,
        netBeforeRecoup,
        advance,
        recoupment,
        finalPayout,
      };
    } else if (dealType === 'admin') {
      const adminDeduction = grossIncome * (adminFee / 100);
      const netAfterAdmin = grossIncome - adminDeduction;
      const recoupment = Math.min(netAfterAdmin, priorBalance + advance);
      const finalPayout = netAfterAdmin - recoupment;

      result = {
        dealType: 'Admin Deal',
        grossIncome,
        adminFee: adminDeduction,
        netAfterAdmin,
        advance,
        recoupment,
        finalPayout,
        note: 'Admin fees are non-recoupable',
      };
    } else {
      return res.status(400).json({ error: 'Invalid deal type' });
    }

    res.json(result);
  } catch (error) {
    console.error('Publishing simulator error:', error);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

export default router;
