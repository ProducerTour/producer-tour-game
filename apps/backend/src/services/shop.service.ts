import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import type { ProductType, ProductStatus, OrderStatus, ShopSubscriptionInterval } from '../generated/client';
import { recordReferralConversion } from './gamification.service';

// Initialize Stripe
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover' as any,
    typescript: true,
  });
  console.log('✅ Shop Stripe service initialized');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Shop payments will not work.');
}

const ensureStripeConfigured = () => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
};

// Helper to convert subscription interval to Stripe interval
const toStripeInterval = (interval: ShopSubscriptionInterval): Stripe.PriceCreateParams.Recurring.Interval => {
  switch (interval) {
    case 'DAILY': return 'day';
    case 'WEEKLY': return 'week';
    case 'MONTHLY': return 'month';
    case 'QUARTERLY': return 'month'; // Handle with interval_count
    case 'YEARLY': return 'year';
    default: return 'month';
  }
};

const getIntervalCount = (interval: ShopSubscriptionInterval): number => {
  return interval === 'QUARTERLY' ? 3 : 1;
};

// Generate order number
const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  return `PT-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Generate URL-safe slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const shopService = {
  // =====================
  // PRODUCT MANAGEMENT
  // =====================

  /**
   * Create a new product
   */
  async createProduct(data: {
    name: string;
    description?: string;
    shortDescription?: string;
    type: ProductType;
    price: number;
    salePrice?: number;
    saleStart?: Date;
    saleEnd?: Date;
    sku?: string;
    stockQuantity?: number;
    manageStock?: boolean;
    subscriptionInterval?: ShopSubscriptionInterval;
    subscriptionIntervalCount?: number;
    trialDays?: number;
    featuredImageUrl?: string;
    galleryUrls?: string[];
    isFeatured?: boolean;
    isVirtual?: boolean;
    downloadLimit?: number;
    downloadExpiry?: number;
    toolId?: string;
    categoryIds?: string[];
  }) {
    const stripeClient = ensureStripeConfigured();

    // Generate unique slug
    let slug = generateSlug(data.name);
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create Stripe product
    // Note: Stripe only accepts HTTP URLs for images, not base64 data URLs
    const isBase64Image = data.featuredImageUrl?.startsWith('data:');
    const stripeProduct = await stripeClient.products.create({
      name: data.name,
      description: data.shortDescription || data.description || undefined,
      // Only send image URL to Stripe if it's a real URL (not base64)
      images: data.featuredImageUrl && !isBase64Image ? [data.featuredImageUrl] : undefined,
      metadata: {
        type: data.type,
        toolId: data.toolId || '',
      },
    });

    // Create Stripe price
    let stripePrice: Stripe.Price;

    if (data.type === 'SUBSCRIPTION' && data.subscriptionInterval) {
      stripePrice = await stripeClient.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
        recurring: {
          interval: toStripeInterval(data.subscriptionInterval),
          interval_count: data.subscriptionIntervalCount || getIntervalCount(data.subscriptionInterval),
          trial_period_days: data.trialDays || undefined,
        },
      });
    } else {
      stripePrice = await stripeClient.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'usd',
      });
    }

    // Create product in database
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        type: data.type,
        status: 'DRAFT',
        price: data.price,
        salePrice: data.salePrice,
        saleStart: data.saleStart,
        saleEnd: data.saleEnd,
        sku: data.sku,
        stockQuantity: data.stockQuantity,
        manageStock: data.manageStock || false,
        subscriptionInterval: data.subscriptionInterval,
        subscriptionIntervalCount: data.subscriptionIntervalCount,
        trialDays: data.trialDays,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        featuredImageUrl: data.featuredImageUrl,
        galleryUrls: data.galleryUrls,
        isFeatured: data.isFeatured || false,
        isVirtual: data.isVirtual || data.type !== 'PHYSICAL',
        downloadLimit: data.downloadLimit,
        downloadExpiry: data.downloadExpiry,
        toolId: data.toolId,
        categories: data.categoryIds ? {
          create: data.categoryIds.map(categoryId => ({ categoryId })),
        } : undefined,
      },
      include: {
        categories: { include: { category: true } },
        variations: true,
        files: true,
      },
    });

    return product;
  },

  /**
   * Update a product
   */
  async updateProduct(productId: string, data: Partial<{
    name: string;
    description: string;
    shortDescription: string;
    type: ProductType;
    status: ProductStatus;
    price: number;
    salePrice: number | null;
    saleStart: Date | null;
    saleEnd: Date | null;
    sku: string | null;
    stockQuantity: number | null;
    manageStock: boolean;
    subscriptionInterval: ShopSubscriptionInterval | null;
    subscriptionIntervalCount: number | null;
    trialDays: number | null;
    featuredImageUrl: string | null;
    galleryUrls: string[];
    isFeatured: boolean;
    isVirtual: boolean;
    downloadLimit: number | null;
    downloadExpiry: number | null;
    toolId: string | null;
    categoryIds: string[];
  }>) {
    const stripeClient = ensureStripeConfigured();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Update Stripe product if needed
    // Note: Stripe only accepts HTTP URLs for images, not base64 data URLs
    if (product.stripeProductId && (data.name || data.description || data.featuredImageUrl)) {
      const isBase64Image = data.featuredImageUrl?.startsWith('data:');
      await stripeClient.products.update(product.stripeProductId, {
        name: data.name || undefined,
        description: data.shortDescription || data.description || undefined,
        // Only send image URL to Stripe if it's a real URL (not base64)
        images: data.featuredImageUrl && !isBase64Image ? [data.featuredImageUrl] : undefined,
      });
    }

    // If price changed, create new Stripe price (prices are immutable in Stripe)
    let newPriceId = product.stripePriceId;
    if (data.price !== undefined && data.price !== Number(product.price)) {
      if (product.stripeProductId) {
        const isSubscription = (data.type || product.type) === 'SUBSCRIPTION';
        const interval = data.subscriptionInterval || product.subscriptionInterval;

        if (isSubscription && interval) {
          const newPrice = await stripeClient.prices.create({
            product: product.stripeProductId,
            unit_amount: Math.round(data.price * 100),
            currency: 'usd',
            recurring: {
              interval: toStripeInterval(interval),
              interval_count: data.subscriptionIntervalCount || product.subscriptionIntervalCount || getIntervalCount(interval),
              trial_period_days: data.trialDays ?? product.trialDays ?? undefined,
            },
          });
          newPriceId = newPrice.id;
        } else {
          const newPrice = await stripeClient.prices.create({
            product: product.stripeProductId,
            unit_amount: Math.round(data.price * 100),
            currency: 'usd',
          });
          newPriceId = newPrice.id;
        }
      }
    }

    // Handle category updates
    if (data.categoryIds) {
      // Remove existing categories
      await prisma.productToCategory.deleteMany({
        where: { productId },
      });
      // Add new categories
      await prisma.productToCategory.createMany({
        data: data.categoryIds.map(categoryId => ({ productId, categoryId })),
      });
    }

    // Update product in database
    const { categoryIds, ...updateData } = data;
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...updateData,
        stripePriceId: newPriceId,
      },
      include: {
        categories: { include: { category: true } },
        variations: true,
        files: true,
        attributes: true,
      },
    });

    return updatedProduct;
  },

  /**
   * Get all products
   */
  async getProducts(options?: {
    status?: ProductStatus;
    type?: ProductType;
    categoryId?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;
    if (options?.featured) where.isFeatured = true;
    if (options?.categoryId) {
      where.categories = { some: { categoryId: options.categoryId } };
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          variations: true,
          files: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  },

  /**
   * Get single product by ID or slug
   */
  async getProduct(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
      },
      include: {
        categories: { include: { category: true } },
        variations: true,
        files: true,
        attributes: true,
      },
    });

    return product;
  },

  /**
   * Delete a product
   */
  async deleteProduct(productId: string) {
    const stripeClient = ensureStripeConfigured();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Archive in Stripe (can't delete)
    if (product.stripeProductId) {
      await stripeClient.products.update(product.stripeProductId, {
        active: false,
      });
    }

    // Delete from database
    await prisma.product.delete({
      where: { id: productId },
    });

    return { success: true };
  },

  // =====================
  // PRODUCT VARIATIONS
  // =====================

  async createVariation(productId: string, data: {
    attributes: Record<string, string>;
    price: number;
    salePrice?: number;
    sku?: string;
    stockQuantity?: number;
    imageUrl?: string;
  }) {
    const stripeClient = ensureStripeConfigured();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.stripeProductId) {
      throw new Error('Product not found');
    }

    // Create Stripe price for variation
    const stripePrice = await stripeClient.prices.create({
      product: product.stripeProductId,
      unit_amount: Math.round(data.price * 100),
      currency: 'usd',
      metadata: {
        variationAttributes: JSON.stringify(data.attributes),
      },
    });

    const variation = await prisma.productVariation.create({
      data: {
        productId,
        attributes: data.attributes,
        price: data.price,
        salePrice: data.salePrice,
        sku: data.sku,
        stockQuantity: data.stockQuantity,
        imageUrl: data.imageUrl,
        stripePriceId: stripePrice.id,
      },
    });

    return variation;
  },

  // =====================
  // PRODUCT FILES
  // =====================

  async addProductFile(productId: string, data: {
    name: string;
    filename: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    variationId?: string;
  }) {
    const file = await prisma.productFile.create({
      data: {
        productId,
        variationId: data.variationId,
        name: data.name,
        filename: data.filename,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });

    return file;
  },

  // =====================
  // CATEGORIES
  // =====================

  async createCategory(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
  }) {
    let slug = generateSlug(data.name);
    const existing = await prisma.productCategory.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    return prisma.productCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId,
      },
    });
  },

  async getCategories() {
    return prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  },

  // =====================
  // CHECKOUT & ORDERS
  // =====================

  /**
   * Create a Stripe Checkout session
   */
  async createCheckoutSession(data: {
    items: Array<{
      productId: string;
      variationId?: string;
      quantity: number;
    }>;
    userId?: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
    couponCode?: string;
    billingAddress?: any;
    shippingAddress?: any;
    referralCode?: string;
  }) {
    const stripeClient = ensureStripeConfigured();

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: any[] = [];
    let hasPhysicalProduct = false;
    let hasSubscription = false;

    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variations: true },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      let priceId = product.stripePriceId;
      let variation = null;
      let price = Number(product.salePrice || product.price);

      if (item.variationId) {
        variation = product.variations.find(v => v.id === item.variationId);
        if (variation) {
          priceId = variation.stripePriceId || priceId;
          price = Number(variation.salePrice || variation.price);
        }
      }

      if (!priceId) {
        throw new Error(`No price configured for product: ${product.name}`);
      }

      if (product.type === 'PHYSICAL') hasPhysicalProduct = true;
      if (product.type === 'SUBSCRIPTION') hasSubscription = true;

      lineItems.push({
        price: priceId,
        quantity: item.quantity,
      });

      orderItems.push({
        productId: product.id,
        variationId: item.variationId,
        productName: product.name,
        productType: product.type,
        variationName: variation ? Object.values(variation.attributes as object).join(' / ') : null,
        sku: variation?.sku || product.sku,
        quantity: item.quantity,
        price,
        subtotal: price * item.quantity,
        total: price * item.quantity,
      });
    }

    // Determine mode
    const mode = hasSubscription ? 'subscription' : 'payment';

    // Create or retrieve Stripe customer (required for Accounts V2)
    let customerId: string | undefined;

    if (data.userId) {
      // Check if user already has a Stripe customer ID
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { stripeCustomerId: true, email: true, firstName: true, lastName: true },
      });

      if (user?.stripeCustomerId) {
        customerId = user.stripeCustomerId;
      } else if (user) {
        // Create Stripe customer for this user
        const customer = await stripeClient.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: {
            userId: data.userId,
          },
        });

        // Save customer ID to user
        await prisma.user.update({
          where: { id: data.userId },
          data: { stripeCustomerId: customer.id },
        });

        customerId = customer.id;
      }
    } else if (data.email) {
      // For guest checkout, create a customer with just email
      const customer = await stripeClient.customers.create({
        email: data.email,
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      customer: customerId, // Use customer ID instead of customer_email for Accounts V2
      customer_email: !customerId ? data.email : undefined, // Fallback to email if no customer ID
      metadata: {
        userId: data.userId || '',
        itemsJson: JSON.stringify(orderItems),
        referralCode: data.referralCode || '',
      },
      billing_address_collection: 'auto',
      shipping_address_collection: hasPhysicalProduct ? {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
      } : undefined,
    };

    // Apply coupon if provided
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode },
      });

      if (coupon?.stripeCouponId && coupon.isActive) {
        sessionParams.discounts = [{ coupon: coupon.stripeCouponId }];
      }
    }

    const session = await stripeClient.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  },

  /**
   * Handle successful checkout (webhook)
   */
  async handleCheckoutComplete(sessionId: string) {
    const stripeClient = ensureStripeConfigured();

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'payment_intent', 'subscription'],
    }) as any; // Cast to any to handle varying Stripe API versions

    if (!session.metadata?.itemsJson) {
      throw new Error('Invalid session metadata');
    }

    const orderItems = JSON.parse(session.metadata.itemsJson);
    const orderNumber = await generateOrderNumber();

    // Resolve referral code to get referrer user ID
    let referralCode: string | null = session.metadata.referralCode || null;
    let referredByUserId: string | null = null;

    if (referralCode) {
      const referrerGamification = await prisma.gamificationPoints.findUnique({
        where: { referralCode },
        select: { userId: true },
      });
      referredByUserId = referrerGamification?.userId || null;
    }

    // Calculate totals
    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const totalAmount = (session.amount_total || 0) / 100;
    const taxAmount = ((session.total_details?.amount_tax || 0) / 100);
    const discountAmount = ((session.total_details?.amount_discount || 0) / 100);

    // Extract shipping details (may be in different locations depending on API version)
    const shippingDetails = session.shipping_details || session.shipping || {};

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.metadata.userId || null,
        email: session.customer_email || session.customer_details?.email || '',
        status: 'PROCESSING',
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        // Affiliate tracking
        referralCode,
        referredByUserId,
        paymentMethod: 'stripe',
        stripePaymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
        stripeSessionId: session.id,
        paidAt: new Date(),
        billingFirstName: session.customer_details?.name?.split(' ')[0],
        billingLastName: session.customer_details?.name?.split(' ').slice(1).join(' '),
        billingAddress1: session.customer_details?.address?.line1,
        billingAddress2: session.customer_details?.address?.line2,
        billingCity: session.customer_details?.address?.city,
        billingState: session.customer_details?.address?.state,
        billingPostcode: session.customer_details?.address?.postal_code,
        billingCountry: session.customer_details?.address?.country,
        shippingFirstName: shippingDetails.name?.split(' ')[0],
        shippingLastName: shippingDetails.name?.split(' ').slice(1).join(' '),
        shippingAddress1: shippingDetails.address?.line1,
        shippingAddress2: shippingDetails.address?.line2,
        shippingCity: shippingDetails.address?.city,
        shippingState: shippingDetails.address?.state,
        shippingPostcode: shippingDetails.address?.postal_code,
        shippingCountry: shippingDetails.address?.country,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Handle subscription creation if applicable
    if (session.subscription && session.metadata.userId) {
      const stripeSubscription: any = typeof session.subscription === 'string'
        ? await stripeClient.subscriptions.retrieve(session.subscription)
        : session.subscription;

      // Find subscription product in order
      const subscriptionItem = order.items.find(
        item => item.productType === 'SUBSCRIPTION'
      );

      if (subscriptionItem) {
        await prisma.shopSubscription.create({
          data: {
            userId: session.metadata.userId,
            productId: subscriptionItem.productId,
            status: 'ACTIVE',
            interval: subscriptionItem.product.subscriptionInterval || 'MONTHLY',
            intervalCount: subscriptionItem.product.subscriptionIntervalCount || 1,
            price: subscriptionItem.price,
            stripeSubscriptionId: stripeSubscription.id,
            stripeCustomerId: typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id,
            stripePriceId: stripeSubscription.items.data[0]?.price.id,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialStart: stripeSubscription.trial_start
              ? new Date(stripeSubscription.trial_start * 1000)
              : null,
            trialEnd: stripeSubscription.trial_end
              ? new Date(stripeSubscription.trial_end * 1000)
              : null,
          },
        });

        // Also create ToolSubscription if product has toolId
        if (subscriptionItem.product.toolId) {
          await prisma.toolSubscription.upsert({
            where: {
              userId_toolId_type: {
                userId: session.metadata.userId,
                toolId: subscriptionItem.product.toolId,
                type: 'PAID',
              },
            },
            update: {
              status: 'ACTIVE',
              stripeSubscriptionId: stripeSubscription.id,
              stripePriceId: stripeSubscription.items.data[0]?.price.id,
              usesRemaining: 0, // Unlimited for paid subscriptions
              expiresAt: new Date(stripeSubscription.current_period_end * 1000),
            },
            create: {
              userId: session.metadata.userId,
              toolId: subscriptionItem.product.toolId,
              toolName: subscriptionItem.productName,
              type: 'PAID',
              status: 'ACTIVE',
              stripeSubscriptionId: stripeSubscription.id,
              stripePriceId: stripeSubscription.items.data[0]?.price.id,
              usesRemaining: 0,
              expiresAt: new Date(stripeSubscription.current_period_end * 1000),
            },
          });
        }
      }
    }

    // Create download access for downloadable products
    for (const orderItem of order.items) {
      if (['DIGITAL', 'DOWNLOADABLE'].includes(orderItem.productType)) {
        const files = await prisma.productFile.findMany({
          where: {
            productId: orderItem.productId,
            variationId: orderItem.variationId,
          },
        });

        for (const file of files) {
          const product = orderItem.product;
          await prisma.orderDownload.create({
            data: {
              orderId: order.id,
              fileId: file.id,
              downloadLimit: product.downloadLimit,
              expiresAt: product.downloadExpiry
                ? new Date(Date.now() + product.downloadExpiry * 24 * 60 * 60 * 1000)
                : null,
            },
          });
        }
      }
    }

    // Trigger referral conversion if this user was referred and this is their first order
    if (session.metadata.userId) {
      const userId = session.metadata.userId;

      // Check if this is the user's first completed order
      const previousOrdersCount = await prisma.order.count({
        where: {
          userId,
          status: { in: ['PROCESSING', 'COMPLETED'] },
          id: { not: order.id }, // Exclude current order
        },
      });

      if (previousOrdersCount === 0) {
        // This is their first purchase - trigger conversion for affiliates
        try {
          await recordReferralConversion(userId);
          console.log(`🎉 Referral conversion triggered for user ${userId}`);
        } catch (error) {
          // Don't fail the order if conversion tracking fails
          console.error('Failed to record referral conversion:', error);
        }
      }
    }

    return order;
  },

  /**
   * Get orders for a user
   */
  async getUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: true, variation: true } },
        downloads: { include: { file: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get all orders (admin)
   */
  async getAllOrders(options?: {
    status?: OrderStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (options?.status) where.status = options.status;
    if (options?.search) {
      where.OR = [
        { orderNumber: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  },

  // =====================
  // SUBSCRIPTIONS
  // =====================

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string) {
    return prisma.shopSubscription.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelImmediately = false) {
    const stripeClient = ensureStripeConfigured();

    const subscription = await prisma.shopSubscription.findUnique({
      where: { id: subscriptionId },
      include: { product: true },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('Subscription not found');
    }

    if (cancelImmediately) {
      await stripeClient.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update database
    await prisma.shopSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: cancelImmediately ? 'CANCELLED' : 'ACTIVE',
        cancelledAt: cancelImmediately ? new Date() : null,
        cancelAtPeriodEnd: !cancelImmediately,
      },
    });

    // Also update ToolSubscription if linked
    if (subscription.product.toolId) {
      await prisma.toolSubscription.updateMany({
        where: {
          userId: subscription.userId,
          toolId: subscription.product.toolId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        },
        data: {
          status: cancelImmediately ? 'CANCELLED' : 'ACTIVE',
        },
      });
    }

    return { success: true };
  },

  // =====================
  // DOWNLOADS
  // =====================

  /**
   * Get download URL
   */
  async getDownloadUrl(accessToken: string) {
    const download = await prisma.orderDownload.findUnique({
      where: { accessToken },
      include: {
        file: true,
        order: true,
      },
    });

    if (!download) {
      throw new Error('Download not found');
    }

    // Check expiry
    if (download.expiresAt && download.expiresAt < new Date()) {
      throw new Error('Download has expired');
    }

    // Check download limit
    if (download.downloadLimit && download.downloadsUsed >= download.downloadLimit) {
      throw new Error('Download limit reached');
    }

    // Increment download count
    await prisma.orderDownload.update({
      where: { id: download.id },
      data: {
        downloadsUsed: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    // Increment file download count
    await prisma.productFile.update({
      where: { id: download.fileId },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    return download.file.fileUrl;
  },

  // =====================
  // COUPONS
  // =====================

  async createCoupon(data: {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed_cart' | 'fixed_product';
    discountAmount: number;
    usageLimit?: number;
    usageLimitPerUser?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    startDate?: Date;
    endDate?: Date;
    firstPurchaseOnly?: boolean;
  }) {
    const stripeClient = ensureStripeConfigured();

    // Create Stripe coupon
    const stripeCoupon = await stripeClient.coupons.create({
      id: data.code.toUpperCase(),
      duration: 'once',
      ...(data.discountType === 'percentage'
        ? { percent_off: data.discountAmount }
        : { amount_off: Math.round(data.discountAmount * 100), currency: 'usd' }),
      max_redemptions: data.usageLimit,
    });

    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discountType: data.discountType,
        discountAmount: data.discountAmount,
        usageLimit: data.usageLimit,
        usageLimitPerUser: data.usageLimitPerUser,
        minimumAmount: data.minimumAmount,
        maximumAmount: data.maximumAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        firstPurchaseOnly: data.firstPurchaseOnly,
        stripeCouponId: stripeCoupon.id,
      },
    });
  },

  async getCoupons() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  // =====================
  // STRIPE WEBHOOKS
  // =====================

  async handleWebhook(event: Stripe.Event) {
    const eventData = event.data.object as any; // Cast to any for API version compatibility

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(eventData.id);
        break;

      case 'customer.subscription.updated':
        await prisma.shopSubscription.updateMany({
          where: { stripeSubscriptionId: eventData.id },
          data: {
            status: eventData.status === 'active' ? 'ACTIVE' :
                   eventData.status === 'past_due' ? 'PAST_DUE' :
                   eventData.status === 'canceled' ? 'CANCELLED' : 'ACTIVE',
            currentPeriodStart: eventData.current_period_start
              ? new Date(eventData.current_period_start * 1000)
              : undefined,
            currentPeriodEnd: eventData.current_period_end
              ? new Date(eventData.current_period_end * 1000)
              : undefined,
            cancelAtPeriodEnd: eventData.cancel_at_period_end,
          },
        });
        break;

      case 'customer.subscription.deleted':
        await prisma.shopSubscription.updateMany({
          where: { stripeSubscriptionId: eventData.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });
        // Also update ToolSubscription
        await prisma.toolSubscription.updateMany({
          where: { stripeSubscriptionId: eventData.id },
          data: { status: 'CANCELLED' },
        });
        break;

      case 'invoice.payment_succeeded':
        if (eventData.subscription) {
          await prisma.shopSubscription.updateMany({
            where: { stripeSubscriptionId: eventData.subscription as string },
            data: {
              lastPaymentAt: new Date(),
              lastPaymentAmount: (eventData.amount_paid || 0) / 100,
              failedPaymentCount: 0,
            },
          });
        }
        break;

      case 'invoice.payment_failed':
        if (eventData.subscription) {
          await prisma.shopSubscription.updateMany({
            where: { stripeSubscriptionId: eventData.subscription as string },
            data: {
              status: 'PAST_DUE',
              failedPaymentCount: { increment: 1 },
            },
          });
        }
        break;
    }
  },

  /**
   * Get shop statistics for dashboard
   */
  async getShopStats() {
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { status: { in: ['PROCESSING', 'COMPLETED'] } },
        _sum: { totalAmount: true },
      }),
      prisma.shopSubscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      activeSubscriptions,
    };
  },
};
