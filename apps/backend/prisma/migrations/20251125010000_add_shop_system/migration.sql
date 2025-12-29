-- Add shop system enums and tables
-- This migration adds the e-commerce shop functionality

-- Create enums
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE', 'DIGITAL', 'DOWNLOADABLE', 'PHYSICAL', 'SUBSCRIPTION');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED');
CREATE TYPE "ShopSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE');
CREATE TYPE "ShopSubscriptionInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- ProductCategory table
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Product table
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'SIMPLE',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "saleStart" TIMESTAMP(3),
    "saleEnd" TIMESTAMP(3),
    "sku" TEXT UNIQUE,
    "stockQuantity" INTEGER,
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" INTEGER DEFAULT 5,
    "subscriptionInterval" "ShopSubscriptionInterval",
    "subscriptionIntervalCount" INTEGER DEFAULT 1,
    "trialDays" INTEGER DEFAULT 0,
    "stripeProductId" TEXT UNIQUE,
    "stripePriceId" TEXT,
    "featuredImageUrl" TEXT,
    "galleryUrls" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "taxClass" TEXT DEFAULT 'standard',
    "weight" DECIMAL(8,2),
    "dimensions" JSONB,
    "downloadLimit" INTEGER,
    "downloadExpiry" INTEGER,
    "toolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ProductToCategory junction table
CREATE TABLE "product_to_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "product_to_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_to_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_to_categories_productId_categoryId_key" UNIQUE ("productId", "categoryId")
);

-- ProductAttribute table
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isVariation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ProductVariation table
CREATE TABLE "product_variations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "sku" TEXT UNIQUE,
    "stockQuantity" INTEGER,
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT UNIQUE,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_variations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ProductFile table
CREATE TABLE "product_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_files_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_files_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Order table
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "billingFirstName" TEXT,
    "billingLastName" TEXT,
    "billingCompany" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "billingPhone" TEXT,
    "shippingFirstName" TEXT,
    "shippingLastName" TEXT,
    "shippingCompany" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostcode" TEXT,
    "shippingCountry" TEXT,
    "shippingPhone" TEXT,
    "shippingMethod" TEXT,
    "shippingCost" DECIMAL(12,2),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT,
    "stripePaymentIntentId" TEXT UNIQUE,
    "stripeSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "couponCode" TEXT,
    "discountDetails" JSONB,
    "customerNote" TEXT,
    "adminNote" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3)
);

-- OrderItem table
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "productName" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "variationName" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "subscriptionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON UPDATE CASCADE,
    CONSTRAINT "order_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON UPDATE CASCADE
);

-- OrderDownload table
CREATE TABLE "order_downloads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "downloadsUsed" INTEGER NOT NULL DEFAULT 0,
    "downloadLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDownloadAt" TIMESTAMP(3),
    CONSTRAINT "order_downloads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_downloads_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "product_files"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_downloads_orderId_fileId_key" UNIQUE ("orderId", "fileId")
);

-- ShopSubscription table
CREATE TABLE "shop_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ShopSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "ShopSubscriptionInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeSubscriptionId" TEXT UNIQUE,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(12,2),
    "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON UPDATE CASCADE
);

-- Coupon table
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "usageLimit" INTEGER,
    "usageLimitPerUser" INTEGER DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "minimumAmount" DECIMAL(12,2),
    "maximumAmount" DECIMAL(12,2),
    "productIds" JSONB,
    "categoryIds" JSONB,
    "excludedProductIds" JSONB,
    "excludedCategoryIds" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false,
    "stripeCouponId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes
CREATE INDEX "product_categories_slug_idx" ON "product_categories"("slug");
CREATE INDEX "product_categories_parentId_idx" ON "product_categories"("parentId");
CREATE INDEX "product_categories_isActive_idx" ON "product_categories"("isActive");

CREATE INDEX "products_slug_idx" ON "products"("slug");
CREATE INDEX "products_type_idx" ON "products"("type");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "products_stripeProductId_idx" ON "products"("stripeProductId");
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");

CREATE INDEX "product_to_categories_productId_idx" ON "product_to_categories"("productId");
CREATE INDEX "product_to_categories_categoryId_idx" ON "product_to_categories"("categoryId");

CREATE INDEX "product_attributes_productId_idx" ON "product_attributes"("productId");

CREATE INDEX "product_variations_productId_idx" ON "product_variations"("productId");
CREATE INDEX "product_variations_stripePriceId_idx" ON "product_variations"("stripePriceId");

CREATE INDEX "product_files_productId_idx" ON "product_files"("productId");
CREATE INDEX "product_files_variationId_idx" ON "product_files"("variationId");

CREATE INDEX "orders_userId_idx" ON "orders"("userId");
CREATE INDEX "orders_email_idx" ON "orders"("email");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_stripePaymentIntentId_idx" ON "orders"("stripePaymentIntentId");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");
CREATE INDEX "order_items_variationId_idx" ON "order_items"("variationId");

CREATE INDEX "order_downloads_orderId_idx" ON "order_downloads"("orderId");
CREATE INDEX "order_downloads_fileId_idx" ON "order_downloads"("fileId");
CREATE INDEX "order_downloads_accessToken_idx" ON "order_downloads"("accessToken");

CREATE INDEX "shop_subscriptions_userId_idx" ON "shop_subscriptions"("userId");
CREATE INDEX "shop_subscriptions_productId_idx" ON "shop_subscriptions"("productId");
CREATE INDEX "shop_subscriptions_status_idx" ON "shop_subscriptions"("status");
CREATE INDEX "shop_subscriptions_stripeSubscriptionId_idx" ON "shop_subscriptions"("stripeSubscriptionId");

CREATE INDEX "coupons_code_idx" ON "coupons"("code");
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");
CREATE INDEX "coupons_stripeCouponId_idx" ON "coupons"("stripeCouponId");
