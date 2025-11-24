import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { shopService } from '../services/shop.service';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware';
import type { ProductType, ProductStatus, OrderStatus, ShopSubscriptionInterval } from '../generated/client';

const router = Router();

// Initialize Stripe for webhook verification
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-10-29.clover' as any })
  : null;

// =====================
// PRODUCTS (Public + Admin)
// =====================

/**
 * GET /api/shop/products
 * Get all products (public: active only, admin: all)
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers.authorization ? true : false; // Simple check, improve with proper auth
    const { status, type, category, featured, search, limit, offset } = req.query;

    const products = await shopService.getProducts({
      status: isAdmin ? (status as ProductStatus) : 'ACTIVE',
      type: type as ProductType,
      categoryId: category as string,
      featured: featured === 'true',
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(products);
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: error.message || 'Failed to get products' });
  }
});

/**
 * GET /api/shop/products/:idOrSlug
 * Get single product by ID or slug
 */
router.get('/products/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const product = await shopService.getProduct(req.params.idOrSlug);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({ error: error.message || 'Failed to get product' });
  }
});

/**
 * POST /api/shop/products
 * Create a new product (admin only)
 */
router.post('/products', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const product = await shopService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

/**
 * PUT /api/shop/products/:id
 * Update a product (admin only)
 */
router.put('/products/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const product = await shopService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

/**
 * DELETE /api/shop/products/:id
 * Delete a product (admin only)
 */
router.delete('/products/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    await shopService.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

// =====================
// PRODUCT VARIATIONS
// =====================

/**
 * POST /api/shop/products/:id/variations
 * Create a product variation (admin only)
 */
router.post('/products/:id/variations', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const variation = await shopService.createVariation(req.params.id, req.body);
    res.status(201).json(variation);
  } catch (error: any) {
    console.error('Create variation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create variation' });
  }
});

// =====================
// PRODUCT FILES
// =====================

/**
 * POST /api/shop/products/:id/files
 * Add a file to a product (admin only)
 */
router.post('/products/:id/files', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const file = await shopService.addProductFile(req.params.id, req.body);
    res.status(201).json(file);
  } catch (error: any) {
    console.error('Add product file error:', error);
    res.status(500).json({ error: error.message || 'Failed to add file' });
  }
});

// =====================
// CATEGORIES
// =====================

/**
 * GET /api/shop/categories
 * Get all categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await shopService.getCategories();
    res.json(categories);
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message || 'Failed to get categories' });
  }
});

/**
 * POST /api/shop/categories
 * Create a category (admin only)
 */
router.post('/categories', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await shopService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// =====================
// CHECKOUT
// =====================

/**
 * POST /api/shop/checkout
 * Create a Stripe Checkout session
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { items, email, successUrl, cancelUrl, couponCode, billingAddress, shippingAddress } = req.body;

    // Get user ID if authenticated
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Extract user from token - simplified, use proper auth middleware in production
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
      } catch {
        // Not authenticated, continue as guest
      }
    }

    const session = await shopService.createCheckoutSession({
      items,
      userId,
      email,
      successUrl,
      cancelUrl,
      couponCode,
      billingAddress,
      shippingAddress,
    });

    res.json(session);
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// =====================
// ORDERS
// =====================

/**
 * GET /api/shop/orders
 * Get orders (user: their orders, admin: all orders)
 */
router.get('/orders', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, search, limit, offset } = req.query;

    if (user.role === 'ADMIN') {
      const orders = await shopService.getAllOrders({
        status: status as OrderStatus,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      return res.json(orders);
    }

    const orders = await shopService.getUserOrders(user.id);
    res.json({ orders, total: orders.length });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message || 'Failed to get orders' });
  }
});

/**
 * PUT /api/shop/orders/:id/status
 * Update order status (admin only)
 */
router.put('/orders/:id/status', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await shopService.updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
});

// =====================
// SUBSCRIPTIONS
// =====================

/**
 * GET /api/shop/subscriptions
 * Get user's subscriptions
 */
router.get('/subscriptions', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const subscriptions = await shopService.getUserSubscriptions(user.id);
    res.json(subscriptions);
  } catch (error: any) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscriptions' });
  }
});

/**
 * POST /api/shop/subscriptions/:id/cancel
 * Cancel a subscription
 */
router.post('/subscriptions/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { immediately } = req.body;
    await shopService.cancelSubscription(req.params.id, immediately);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// =====================
// DOWNLOADS
// =====================

/**
 * GET /api/shop/downloads/:accessToken
 * Get download URL for a purchased file
 */
router.get('/downloads/:accessToken', async (req: Request, res: Response) => {
  try {
    const fileUrl = await shopService.getDownloadUrl(req.params.accessToken);

    // Redirect to actual file or return URL
    if (fileUrl.startsWith('http')) {
      return res.redirect(fileUrl);
    }

    res.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(403).json({ error: error.message || 'Download not available' });
  }
});

// =====================
// COUPONS (Admin)
// =====================

/**
 * GET /api/shop/coupons
 * Get all coupons (admin only)
 */
router.get('/coupons', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupons = await shopService.getCoupons();
    res.json(coupons);
  } catch (error: any) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: error.message || 'Failed to get coupons' });
  }
});

/**
 * POST /api/shop/coupons
 * Create a coupon (admin only)
 */
router.post('/coupons', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupon = await shopService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (error: any) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: error.message || 'Failed to create coupon' });
  }
});

/**
 * POST /api/shop/coupons/validate
 * Validate a coupon code
 */
router.post('/coupons/validate', async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    const { prisma } = require('../lib/prisma');

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ valid: false, error: 'Coupon not found' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, error: 'Coupon is no longer active' });
    }

    if (coupon.startDate && new Date() < coupon.startDate) {
      return res.status(400).json({ valid: false, error: 'Coupon is not yet valid' });
    }

    if (coupon.endDate && new Date() > coupon.endDate) {
      return res.status(400).json({ valid: false, error: 'Coupon has expired' });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, error: 'Coupon usage limit reached' });
    }

    if (coupon.minimumAmount && cartTotal < Number(coupon.minimumAmount)) {
      return res.status(400).json({
        valid: false,
        error: `Minimum order amount of $${coupon.minimumAmount} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = cartTotal * (Number(coupon.discountAmount) / 100);
      if (coupon.maximumAmount) {
        discount = Math.min(discount, Number(coupon.maximumAmount));
      }
    } else {
      discount = Number(coupon.discountAmount);
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: coupon.discountAmount,
        description: coupon.description,
      },
      discount,
    });
  } catch (error: any) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate coupon' });
  }
});

// =====================
// STATS (Admin)
// =====================

/**
 * GET /api/shop/stats
 * Get shop statistics
 */
router.get('/stats', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await shopService.getShopStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Get shop stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get shop stats' });
  }
});

// =====================
// STRIPE WEBHOOKS
// =====================

/**
 * POST /api/shop/webhooks/stripe
 * Handle Stripe webhooks
 */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    // Note: req.body needs to be raw for Stripe verification
    // This might require special handling in the main app
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    await shopService.handleWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
