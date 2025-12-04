import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { MarketplaceListingCategory, MarketplaceListingStatus } from '../generated/client';

const router = Router();

// GET /api/marketplace/listings - Browse all marketplace listings
router.get('/listings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as MarketplaceListingCategory | undefined;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId as string | undefined;

    // Build where clause
    const where: any = {
      status: MarketplaceListingStatus.ACTIVE
    };

    if (category) {
      where.category = category;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const listings = await prisma.marketplaceListing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.marketplaceListing.count({ where });

    // If no listings, return mock data for testing
    if (listings.length === 0 && offset === 0 && !search && !category && !userId) {
      const mockListings = [
        {
          id: 'mock-listing-1',
          userId: req.user!.id,
          title: 'Dark Trap Beat Pack',
          description: 'Professional dark trap beats with hard-hitting 808s. Perfect for modern hip-hop artists.',
          category: 'BEATS',
          price: 29.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'dark-trap-beat-pack',
          tags: ['trap', 'dark', '808'],
          viewCount: 127,
          purchaseCount: 8,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'GOLD' }
          }
        },
        {
          id: 'mock-listing-2',
          userId: req.user!.id,
          title: 'Lofi Hip Hop Sample Pack',
          description: 'Chill lofi samples and drum loops. Great for creating relaxing beats.',
          category: 'SAMPLES',
          price: 19.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'lofi-hip-hop-sample-pack',
          tags: ['lofi', 'chill', 'samples'],
          viewCount: 89,
          purchaseCount: 12,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'SILVER' }
          }
        },
        {
          id: 'mock-listing-3',
          userId: req.user!.id,
          title: 'Serum Preset Pack - Future Bass',
          description: '50+ Serum presets for future bass and melodic dubstep production.',
          category: 'PRESETS',
          price: 24.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'serum-preset-pack-future-bass',
          tags: ['serum', 'future bass', 'presets'],
          viewCount: 156,
          purchaseCount: 15,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'PLATINUM' }
          }
        },
        {
          id: 'mock-listing-4',
          userId: req.user!.id,
          title: 'FL Studio Project Template - Melodic Techno',
          description: 'Complete FL Studio project template with stems and MIDI files.',
          category: 'TEMPLATES',
          price: 39.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'fl-studio-template-melodic-techno',
          tags: ['fl studio', 'template', 'techno'],
          viewCount: 203,
          purchaseCount: 6,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'BRONZE' }
          }
        },
        {
          id: 'mock-listing-5',
          userId: req.user!.id,
          title: 'Mixing & Mastering Service',
          description: 'Professional mixing and mastering for your tracks. Includes unlimited revisions.',
          category: 'SERVICES',
          price: 149.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'mixing-mastering-service',
          tags: ['mixing', 'mastering', 'service'],
          viewCount: 342,
          purchaseCount: 4,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'GOLD' }
          }
        },
        {
          id: 'mock-listing-6',
          userId: req.user!.id,
          title: 'Guitar Stems Pack - Indie Rock',
          description: 'High-quality recorded guitar stems. Multiple takes and variations included.',
          category: 'STEMS',
          price: 34.99,
          coverImageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
          audioPreviewUrl: null,
          fileUrl: null,
          slug: 'guitar-stems-pack-indie-rock',
          tags: ['guitar', 'stems', 'rock'],
          viewCount: 78,
          purchaseCount: 9,
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          seller: {
            id: req.user!.id,
            firstName: req.user!.firstName,
            lastName: req.user!.lastName,
            profilePhotoUrl: (req.user as any).profilePhotoUrl || null,
            profileSlug: (req.user as any).profileSlug || null,
            gamificationPoints: { tier: 'SILVER' }
          }
        }
      ];

      return res.json({
        listings: mockListings,
        pagination: {
          limit,
          offset,
          total: mockListings.length,
          hasMore: false
        }
      });
    }

    res.json({
      listings,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get marketplace listings error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// GET /api/marketplace/listings/:slug - Get single listing by slug
router.get('/listings/:slug', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { slug },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true,
            bio: true,
            gamificationPoints: {
              select: {
                tier: true
              }
            }
          }
        },
        transactions: {
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment view count
    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/marketplace/listings - Create new listing
router.post('/listings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      category,
      price,
      coverImageUrl,
      audioPreviewUrl,
      fileUrl,
      slug,
      tags
    } = req.body;

    // Validation
    if (!title || !description || !category || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for slug uniqueness
    const existingListing = await prisma.marketplaceListing.findUnique({
      where: { slug }
    });

    if (existingListing) {
      return res.status(400).json({ error: 'Slug already in use' });
    }

    const listing = await prisma.marketplaceListing.create({
      data: {
        userId,
        title,
        description,
        category,
        price,
        coverImageUrl,
        audioPreviewUrl,
        fileUrl,
        slug,
        tags,
        status: MarketplaceListingStatus.ACTIVE
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true
          }
        }
      }
    });

    // Create activity feed item
    await prisma.activityFeedItem.create({
      data: {
        userId,
        activityType: 'MARKETPLACE_LISTING',
        title: `Listed ${title} for sale`,
        listingId: listing.id,
        imageUrl: coverImageUrl,
        isPublic: true
      }
    });

    res.json(listing);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/marketplace/listings/:id - Update listing
router.put('/listings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this listing' });
    }

    const {
      title,
      description,
      category,
      price,
      coverImageUrl,
      audioPreviewUrl,
      fileUrl,
      tags,
      status
    } = req.body;

    const updatedListing = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        title,
        description,
        category,
        price,
        coverImageUrl,
        audioPreviewUrl,
        fileUrl,
        tags,
        status
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true
          }
        }
      }
    });

    res.json(updatedListing);
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/marketplace/listings/:id - Delete listing
router.delete('/listings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check ownership
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    await prisma.marketplaceListing.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// POST /api/marketplace/purchase - Purchase a listing
router.post('/purchase', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { listingId, stripePaymentIntentId } = req.body;

    if (!listingId || !stripePaymentIntentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get listing with seller info
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            role: true,
            stripeAccountId: true
          }
        }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== MarketplaceListingStatus.ACTIVE) {
      return res.status(400).json({ error: 'Listing is not available for purchase' });
    }

    if (listing.userId === buyerId) {
      return res.status(400).json({ error: 'Cannot purchase your own listing' });
    }

    // Get buyer info for commission calculation
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { role: true }
    });

    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }

    // Calculate commission based on buyer role
    // WRITER role: 0% commission, CUSTOMER role: 5% commission
    const commissionRate = buyer.role === 'WRITER' ? 0 : 5;
    const grossAmount = parseFloat(listing.price.toString());
    const commissionAmount = grossAmount * (commissionRate / 100);
    const netAmount = grossAmount - commissionAmount;

    // Create transaction
    const transaction = await prisma.marketplaceTransaction.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.userId,
        grossAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        stripePaymentIntentId,
        paidAt: new Date()
      },
      include: {
        listing: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update listing purchase count
    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        purchaseCount: { increment: 1 }
      }
    });

    // TODO: Create Stripe transfer to seller's account
    // This would happen in a webhook or background job in production

    res.json({
      success: true,
      transaction,
      downloadUrl: listing.fileUrl // Provide download URL
    });
  } catch (error) {
    console.error('Purchase listing error:', error);
    res.status(500).json({ error: 'Failed to purchase listing' });
  }
});

// GET /api/marketplace/sales - Get user's sales
router.get('/sales', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const sales = await prisma.marketplaceTransaction.findMany({
      where: { sellerId: userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            slug: true
          }
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.marketplaceTransaction.count({
      where: { sellerId: userId }
    });

    // Calculate total earnings
    const totalEarnings = await prisma.marketplaceTransaction.aggregate({
      where: { sellerId: userId },
      _sum: {
        netAmount: true
      }
    });

    res.json({
      sales,
      totalEarnings: totalEarnings._sum.netAmount || 0,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// GET /api/marketplace/purchases - Get user's purchases
router.get('/purchases', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const purchases = await prisma.marketplaceTransaction.findMany({
      where: { buyerId: userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            slug: true,
            fileUrl: true
          }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            profileSlug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.marketplaceTransaction.count({
      where: { buyerId: userId }
    });

    res.json({
      purchases,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// ============ ADMIN BILLING ENDPOINTS ============

// GET /api/marketplace/admin/billing - Get all marketplace billing data for admin
router.get('/admin/billing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const COMMISSION_RATE = 20; // 20% commission for social marketplace

    // Get all transactions with seller and listing info
    const transactions = await prisma.marketplaceTransaction.findMany({
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            slug: true,
            category: true
          }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhotoUrl: true,
            profileSlug: true
          }
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate totals with 20% commission
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;
    let totalTransactions = transactions.length;

    // Process transactions with 20% commission
    const processedTransactions = transactions.map(tx => {
      const gross = parseFloat(tx.grossAmount.toString());
      const commission = gross * (COMMISSION_RATE / 100);
      const net = gross - commission;

      totalGross += gross;
      totalCommission += commission;
      totalNet += net;

      return {
        ...tx,
        grossAmount: gross,
        commissionRate: COMMISSION_RATE,
        commissionAmount: commission,
        netAmount: net
      };
    });

    // Aggregate by seller
    const sellerMap = new Map<string, any>();

    for (const tx of processedTransactions) {
      const sellerId = tx.seller.id;

      if (!sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          seller: tx.seller,
          totalSales: 0,
          totalGross: 0,
          totalCommission: 0,
          totalNet: 0,
          transactions: []
        });
      }

      const sellerData = sellerMap.get(sellerId)!;
      sellerData.totalSales += 1;
      sellerData.totalGross += tx.grossAmount;
      sellerData.totalCommission += tx.commissionAmount;
      sellerData.totalNet += tx.netAmount;
      sellerData.transactions.push(tx);
    }

    const sellerStatements = Array.from(sellerMap.values()).sort(
      (a, b) => b.totalGross - a.totalGross
    );

    // If no transactions, return mock data for testing
    if (transactions.length === 0) {
      const mockOverview = {
        totalGross: 1249.95,
        totalCommission: 249.99,
        totalNet: 999.96,
        totalTransactions: 12,
        commissionRate: COMMISSION_RATE
      };

      const mockSellerStatements = [
        {
          seller: {
            id: 'mock-seller-1',
            firstName: 'Test',
            lastName: 'Seller',
            email: 'seller@test.com',
            profilePhotoUrl: null,
            profileSlug: 'test-seller'
          },
          totalSales: 8,
          totalGross: 799.92,
          totalCommission: 159.98,
          totalNet: 639.94,
          transactions: [
            {
              id: 'mock-tx-1',
              listingId: 'mock-listing-1',
              listing: { id: 'mock-listing-1', title: 'Dark Trap Beat Pack', coverImageUrl: null, slug: 'dark-trap-beat-pack', category: 'BEATS' },
              buyer: { id: 'mock-buyer-1', firstName: 'John', lastName: 'Doe', profilePhotoUrl: null },
              seller: { id: 'mock-seller-1', firstName: 'Test', lastName: 'Seller', email: 'seller@test.com', profilePhotoUrl: null, profileSlug: 'test-seller' },
              grossAmount: 29.99,
              commissionRate: 20,
              commissionAmount: 6.00,
              netAmount: 23.99,
              paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
            }
          ]
        },
        {
          seller: {
            id: 'mock-seller-2',
            firstName: 'Another',
            lastName: 'Producer',
            email: 'producer@test.com',
            profilePhotoUrl: null,
            profileSlug: 'another-producer'
          },
          totalSales: 4,
          totalGross: 450.03,
          totalCommission: 90.01,
          totalNet: 360.02,
          transactions: []
        }
      ];

      return res.json({
        overview: mockOverview,
        sellerStatements: mockSellerStatements,
        transactions: []
      });
    }

    res.json({
      overview: {
        totalGross,
        totalCommission,
        totalNet,
        totalTransactions,
        commissionRate: COMMISSION_RATE
      },
      sellerStatements,
      transactions: processedTransactions
    });
  } catch (error) {
    console.error('Get admin billing error:', error);
    res.status(500).json({ error: 'Failed to fetch billing data' });
  }
});

// GET /api/marketplace/admin/billing/seller/:sellerId - Get specific seller billing details
router.get('/admin/billing/seller/:sellerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Admin only
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sellerId } = req.params;
    const COMMISSION_RATE = 20;

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhotoUrl: true,
        profileSlug: true
      }
    });

    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const transactions = await prisma.marketplaceTransaction.findMany({
      where: { sellerId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            slug: true,
            category: true
          }
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    const processedTransactions = transactions.map(tx => {
      const gross = parseFloat(tx.grossAmount.toString());
      const commission = gross * (COMMISSION_RATE / 100);
      const net = gross - commission;

      totalGross += gross;
      totalCommission += commission;
      totalNet += net;

      return {
        ...tx,
        grossAmount: gross,
        commissionRate: COMMISSION_RATE,
        commissionAmount: commission,
        netAmount: net
      };
    });

    res.json({
      seller,
      summary: {
        totalSales: transactions.length,
        totalGross,
        totalCommission,
        totalNet,
        commissionRate: COMMISSION_RATE
      },
      transactions: processedTransactions
    });
  } catch (error) {
    console.error('Get seller billing error:', error);
    res.status(500).json({ error: 'Failed to fetch seller billing data' });
  }
});

export default router;
