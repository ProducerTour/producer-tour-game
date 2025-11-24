/**
 * Seed Script: Create Video Maker Subscription Product
 *
 * Run with: npx tsx scripts/seed-video-maker-product.ts
 */

import Stripe from 'stripe';
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function seedVideoMakerProduct() {
  // Initialize Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover' as any,
  });

  console.log('🚀 Creating Video Maker subscription product...\n');

  try {
    // Check if product already exists
    const existingProduct = await prisma.product.findFirst({
      where: { toolId: 'type-beat-video-maker' },
    });

    if (existingProduct) {
      console.log('⚠️  Video Maker product already exists:', existingProduct.name);
      console.log('   Product ID:', existingProduct.id);
      console.log('   Stripe Product ID:', existingProduct.stripeProductId);
      console.log('   Status:', existingProduct.status);
      return;
    }

    // Create Stripe product
    console.log('📦 Creating Stripe product...');
    const stripeProduct = await stripe.products.create({
      name: 'Video Maker Pro',
      description: 'Create professional type beat videos with AI-powered tools. Includes unlimited renders, custom templates, and premium features.',
      images: ['https://producertour.com/images/video-maker-product.png'], // Update with actual image URL
      metadata: {
        type: 'SUBSCRIPTION',
        toolId: 'type-beat-video-maker',
      },
    });
    console.log('   ✅ Stripe product created:', stripeProduct.id);

    // Create monthly price ($19.99/month)
    console.log('💰 Creating Stripe price (monthly)...');
    const monthlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: 1999, // $19.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        plan: 'monthly',
      },
    });
    console.log('   ✅ Monthly price created:', monthlyPrice.id);

    // Create yearly price ($149.99/year - save $90)
    console.log('💰 Creating Stripe price (yearly)...');
    const yearlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: 14999, // $149.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1,
      },
      metadata: {
        plan: 'yearly',
      },
    });
    console.log('   ✅ Yearly price created:', yearlyPrice.id);

    // Create product in database
    console.log('💾 Creating product in database...');
    const product = await prisma.product.create({
      data: {
        name: 'Video Maker Pro',
        slug: 'video-maker-pro',
        description: `Create professional type beat videos with AI-powered tools.

## Features
- **Unlimited Video Renders** - No monthly limits
- **Custom Templates** - 50+ professional templates
- **AI-Powered Tools** - Smart transitions and effects
- **4K Export** - High-quality video output
- **Direct YouTube Upload** - One-click publishing
- **Audio Visualization** - Dynamic waveforms and bars
- **Text Animations** - Animated titles and credits
- **Priority Support** - Get help within 24 hours

## Perfect For
- Type beat producers
- Music producers sharing on YouTube
- Artists creating lyric videos
- Content creators`,
        shortDescription: 'Create professional type beat videos with AI-powered tools. Includes unlimited renders, custom templates, and premium features.',
        type: 'SUBSCRIPTION',
        status: 'ACTIVE',
        price: 19.99,
        subscriptionInterval: 'MONTHLY',
        subscriptionIntervalCount: 1,
        trialDays: 7, // 7-day free trial
        stripeProductId: stripeProduct.id,
        stripePriceId: monthlyPrice.id, // Default to monthly
        isFeatured: true,
        isVirtual: true,
        toolId: 'type-beat-video-maker',
      },
    });
    console.log('   ✅ Product created in database:', product.id);

    // Create the product category
    console.log('📂 Creating subscription category...');
    let category = await prisma.productCategory.findFirst({
      where: { slug: 'subscriptions' },
    });

    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          name: 'Subscriptions',
          slug: 'subscriptions',
          description: 'Subscription products and services',
          isActive: true,
        },
      });
      console.log('   ✅ Category created:', category.id);
    } else {
      console.log('   ℹ️  Category already exists:', category.id);
    }

    // Link product to category
    await prisma.productToCategory.create({
      data: {
        productId: product.id,
        categoryId: category.id,
      },
    });
    console.log('   ✅ Product linked to category');

    console.log('\n✨ Video Maker subscription product created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Stripe Product: ${stripeProduct.id}`);
    console.log(`   Monthly Price: $19.99/month (${monthlyPrice.id})`);
    console.log(`   Yearly Price: $149.99/year (${yearlyPrice.id})`);
    console.log(`   Tool ID: type-beat-video-maker`);
    console.log(`   Trial: 7 days`);
    console.log(`   Status: ACTIVE`);

  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedVideoMakerProduct()
  .then(() => {
    console.log('\n✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
