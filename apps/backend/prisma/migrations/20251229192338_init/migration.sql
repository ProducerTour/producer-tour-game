-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WRITER', 'LEGAL', 'MANAGER', 'PUBLISHER', 'STAFF', 'VIEWER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ProType" AS ENUM ('BMI', 'ASCAP', 'SESAC', 'GMR', 'MLC', 'OTHER');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'PUBLISHED', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONTACTED');

-- CreateEnum
CREATE TYPE "ApplicationTier" AS ENUM ('PRIORITY_A', 'PRIORITY_B', 'PRIORITY_C', 'PRIORITY_D');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpportunityPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PENDING', 'DOCUMENTS_REQUESTED', 'APPROVED', 'DENIED', 'TRACKING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StreamingPlatform" AS ENUM ('SPOTIFY', 'APPLE_MUSIC', 'AMAZON_MUSIC', 'YOUTUBE_MUSIC', 'TIDAL', 'DEEZER', 'SOUNDCLOUD', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PRE_PROCESSED_STATEMENT', 'PROCESSED_STATEMENT', 'CONTRACT', 'AGREEMENT', 'INVOICE', 'TAX_DOCUMENT', 'SPLIT_SHEET', 'PRODUCER_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('ADMIN_ONLY', 'USER_SPECIFIC', 'ALL_WRITERS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW_REQUEST', 'FOLLOW_ACCEPTED', 'NEW_FOLLOWER', 'NEW_MESSAGE', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'PLACEMENT_UPDATE', 'PAYMENT_RECEIVED', 'REFERRAL_SIGNUP', 'REFERRAL_CONVERTED', 'SYSTEM_ANNOUNCEMENT', 'MILESTONE_REACHED', 'COMMENT_LIKED_BY_AUTHOR');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SESSION', 'ADVANCE', 'FEE');

-- CreateEnum
CREATE TYPE "AdvanceType" AS ENUM ('FUTURE_ROYALTY', 'DEAL_ADVANCE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "SessionPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GamificationTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE');

-- CreateEnum
CREATE TYPE "GamificationEventType" AS ENUM ('DAILY_CHECK_IN', 'WEEKLY_STREAK_BONUS', 'MONTHLY_STREAK_BONUS', 'SOCIAL_SHARE', 'DISCORD_SHARE', 'REFERRAL_SIGNUP', 'REFERRAL_CONVERSION', 'PROFILE_COMPLETE', 'PROFILE_PHOTO_UPLOAD', 'STRIPE_CONNECTED', 'WORK_SUBMITTED', 'WORK_APPROVED', 'REVENUE_MILESTONE', 'PAYOUT_COMPLETED', 'STATEMENT_VIEWED', 'FEEDBACK_SUBMITTED', 'BUG_REPORTED', 'FEATURE_SUGGESTED', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'REWARD_REDEEMED', 'ADMIN_AWARDED', 'ADMIN_DEDUCTED', 'REWARD_REFUNDED', 'CONFIG_UPDATED');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('SOCIAL', 'PLATFORM', 'REVENUE', 'COMMUNITY', 'ENGAGEMENT', 'MILESTONE');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('COMMISSION', 'PAYOUT', 'PLATFORM', 'SUBSCRIPTION', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'SUPPORT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ToolSubscriptionType" AS ENUM ('FREE_TRIAL', 'TOUR_MILES', 'PAID', 'ADMIN_GRANTED');

-- CreateEnum
CREATE TYPE "ToolSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE', 'DIGITAL', 'DOWNLOADABLE', 'PHYSICAL', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShopSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "ShopSubscriptionInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BusinessContactCategory" AS ENUM ('LABEL', 'PUBLISHER', 'DISTRIBUTOR', 'ATTORNEY', 'MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('AGGREGATOR', 'TASTEMAKERS', 'DISCOVERY', 'NEWS', 'PUBLISHERS');

-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketplaceListingCategory" AS ENUM ('BEATS', 'SAMPLES', 'PRESETS', 'STEMS', 'SERVICES', 'TEMPLATES', 'COURSES', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityFeedType" AS ENUM ('POST', 'PLACEMENT', 'ACHIEVEMENT', 'MARKETPLACE_LISTING', 'TOUR_MILES_EARNED', 'TIER_UP', 'REFERRAL_JOINED', 'ANNOUNCEMENT', 'UPDATE', 'TIP', 'NEWS');

-- CreateEnum
CREATE TYPE "WidgetSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'WIDE', 'TALL');

-- CreateEnum
CREATE TYPE "CorporateEntityType" AS ENUM ('C_CORP', 'LLC');

-- CreateEnum
CREATE TYPE "CorporateEntityStatus" AS ENUM ('NOT_FORMED', 'PENDING', 'ACTIVE', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "QuestCategory" AS ENUM ('FORMATION', 'GOVERNANCE', 'COMPLIANCE', 'FINANCIAL', 'PROTECTION');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "QuestStepActionType" AS ENUM ('INFO', 'EXTERNAL_LINK', 'TEMPLATE', 'UPLOAD', 'VERIFY');

-- CreateEnum
CREATE TYPE "CorporateDocumentCategory" AS ENUM ('FORMATION', 'GOVERNANCE', 'OWNERSHIP', 'TAX', 'COMPLIANCE', 'CONTRACT', 'INSURANCE');

-- CreateEnum
CREATE TYPE "CorporateDocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CURRENT', 'NEEDS_UPDATE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ComplianceItemStatus" AS ENUM ('UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WRITER',
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "writerIpiNumber" TEXT,
    "publisherName" TEXT,
    "publisherIpiNumber" TEXT,
    "subPublisherName" TEXT,
    "subPublisherIpiNumber" TEXT,
    "writerProAffiliation" "ProType",
    "commissionOverrideRate" DECIMAL(5,2),
    "canUploadStatements" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountStatus" TEXT,
    "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "taxFormType" TEXT,
    "taxInfoSubmittedAt" TIMESTAMP(3),
    "taxInfoStatus" TEXT,
    "taxFormLast4" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "availableBalance" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "lifetimeEarnings" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "statementNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlySummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "chatSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatSoundType" TEXT NOT NULL DEFAULT 'chime',
    "chatVisibilityStatus" TEXT NOT NULL DEFAULT 'online',
    "chatShowOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "chatShowTypingIndicator" BOOLEAN NOT NULL DEFAULT true,
    "chatMessagePreview" BOOLEAN NOT NULL DEFAULT true,
    "chatDesktopNotifications" BOOLEAN NOT NULL DEFAULT true,
    "profilePhotoUrl" TEXT,
    "coverBannerUrl" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "spotifyArtistUrl" TEXT,
    "instagramHandle" TEXT,
    "twitterHandle" TEXT,
    "linkedinUrl" TEXT,
    "tiktokHandle" TEXT,
    "soundcloudUrl" TEXT,
    "youtubeChannelUrl" TEXT,
    "appleMusicUrl" TEXT,
    "isPublicProfile" BOOLEAN NOT NULL DEFAULT false,
    "profileSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "equippedBadgeId" TEXT,
    "equippedBorderId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "producerName" TEXT NOT NULL,
    "writerIpiNumber" TEXT,
    "publisherIpiNumber" TEXT,
    "proAffiliation" "ProType",
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements" (
    "id" TEXT NOT NULL,
    "proType" "ProType" NOT NULL,
    "filename" TEXT NOT NULL,
    "displayName" TEXT,
    "filePath" TEXT,
    "status" "StatementStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "totalRevenue" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "totalPerformances" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentProcessedAt" TIMESTAMP(3),
    "paymentProcessedById" TEXT,
    "stripeTransferGroup" TEXT,
    "stripeTransferIds" JSONB,
    "statementPeriod" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_items" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "producerId" TEXT,
    "revenue" DECIMAL(12,6) NOT NULL,
    "performances" INTEGER NOT NULL DEFAULT 0,
    "splitPercentage" DECIMAL(5,2) DEFAULT 100.00,
    "writerIpiNumber" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "commissionAmount" DECIMAL(12,6) NOT NULL DEFAULT 0.00,
    "commissionRecipient" TEXT,
    "netRevenue" DECIMAL(12,6) NOT NULL DEFAULT 0.00,
    "isVisibleToWriter" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "social" TEXT,
    "primaryLink" TEXT NOT NULL,
    "otherLinks" TEXT,
    "pro" TEXT,
    "distributor" TEXT,
    "catalogSize" TEXT NOT NULL,
    "placements" TEXT NOT NULL,
    "royalties" TEXT NOT NULL,
    "readiness" JSONB,
    "engagement" TEXT NOT NULL,
    "needs" JSONB,
    "notes" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" "ApplicationTier",
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "genres" JSONB,
    "budget" TEXT,
    "deadline" TIMESTAMP(3),
    "contact" TEXT,
    "link" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "OpportunityPriority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "tags" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "website" TEXT,
    "businessType" TEXT,
    "companySize" TEXT,
    "budget" TEXT,
    "services" JSONB,
    "projectScope" TEXT,
    "timeline" TEXT,
    "volumeNeeds" TEXT,
    "additionalInfo" TEXT,
    "hearAbout" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "platform" "StreamingPlatform" NOT NULL DEFAULT 'OTHER',
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "isrc" TEXT,
    "spotifyTrackId" TEXT,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "estimatedStreams" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlacementStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "notes" TEXT,
    "albumName" TEXT,
    "genre" TEXT,
    "releaseYear" TEXT,
    "label" TEXT,
    "albumArtUrl" TEXT,
    "albumArtHQUrl" TEXT,
    "artistThumbUrl" TEXT,
    "artistBio" TEXT,
    "musicbrainzId" TEXT,
    "audioDbArtistId" TEXT,
    "audioDbAlbumId" TEXT,
    "audioDbData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "denialReason" TEXT,
    "documentsRequested" TEXT,
    "caseNumber" TEXT,
    "dealTerms" TEXT,
    "advanceAmount" DECIMAL(12,2),
    "royaltyPercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_credits" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "splitPercentage" DECIMAL(5,2) NOT NULL,
    "pro" TEXT,
    "ipiNumber" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "userId" TEXT,
    "publisherIpiNumber" TEXT,
    "isExternalWriter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_deals" (
    "id" TEXT NOT NULL,
    "clientFullName" TEXT NOT NULL,
    "clientPKA" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "streams" TEXT,
    "label" TEXT,
    "coProducers" TEXT,
    "status" TEXT,
    "action" TEXT,
    "legalFeeAmount" TEXT,
    "legalFeeType" TEXT NOT NULL DEFAULT 'Flat Fee',
    "legalFeePaymentSource" TEXT NOT NULL DEFAULT 'Out of Advance',
    "hasLegalFeeBeenPaid" TEXT NOT NULL DEFAULT 'No',
    "advance" TEXT,
    "masterRoyalty" TEXT,
    "pubPercent" TEXT,
    "sxLOD" TEXT,
    "contractContactName" TEXT,
    "contractCompany" TEXT,
    "contractContactEmail" TEXT,
    "contractMailingAddress" TEXT,
    "contractSoundExchangePayee" TEXT,
    "contractCreditLine" TEXT,
    "contractLink" TEXT,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "advReceived" TEXT NOT NULL DEFAULT 'Not Received',
    "masterCol" TEXT NOT NULL DEFAULT 'Not Collecting',
    "soundEx" TEXT NOT NULL DEFAULT 'Not Collecting',
    "publicPerf" TEXT NOT NULL DEFAULT 'Not Collecting',
    "mech" TEXT NOT NULL DEFAULT 'Not Collecting',
    "agreement" TEXT NOT NULL DEFAULT 'Draft has not been received',
    "notes" TEXT,
    "billingClientName" TEXT,
    "billingClientPKA" TEXT,
    "billingClientAddress" TEXT,
    "billingClientCity" TEXT,
    "billingProjectTitle" TEXT,
    "billingInvoiceNumber" TEXT,
    "billingArtistLegal" TEXT,
    "billingArtistStage" TEXT,
    "billingLabelName" TEXT,
    "billingBillToEmail" TEXT,
    "billingBillToContact" TEXT,
    "billingIssueDate" TEXT,
    "billingDueDate" TEXT,
    "billingAmount" TEXT,
    "billingCostsExpenses" TEXT,
    "billingSalesTax" TEXT,
    "billingAmountPaid" TEXT,
    "billingServices" TEXT,
    "billingPaymentTerms" TEXT,
    "billingPaymentChannel" TEXT,
    "billingBookkeepingNotes" TEXT,
    "billingBankAccountName" TEXT,
    "billingBankName" TEXT,
    "billingBankAddress" TEXT,
    "billingRoutingNumber" TEXT,
    "billingAccountNumber" TEXT,
    "billingSwiftCode" TEXT,
    "invoiceDraftHtml" TEXT,
    "createdById" TEXT,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ipiNumber" TEXT,
    "splitPercentage" DECIMAL(5,2) NOT NULL,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pro_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proName" "ProType" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "placementIds" JSONB,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pro_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_scenarios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "catalogSize" INTEGER NOT NULL,
    "monthlyRoyalties" DECIMAL(12,2) NOT NULL,
    "contractLength" INTEGER NOT NULL,
    "artistIncome" INTEGER NOT NULL,
    "includeNewReleases" BOOLEAN NOT NULL DEFAULT false,
    "switchDistributors" BOOLEAN NOT NULL DEFAULT false,
    "upfrontAdvance" DECIMAL(12,2) NOT NULL,
    "newReleaseAdvance" DECIMAL(12,2),
    "optionAdvance" DECIMAL(12,2),
    "recoupmentRate" INTEGER NOT NULL,
    "estimatedTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "description" TEXT,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
    "uploadedById" TEXT NOT NULL,
    "relatedUserId" TEXT,
    "statementId" TEXT,
    "placementId" TEXT,
    "metadata" JSONB,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_settings" (
    "id" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "recipientName" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producer_tour_publishers" (
    "id" TEXT NOT NULL,
    "ipiNumber" TEXT NOT NULL,
    "publisherName" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producer_tour_publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "failureReason" TEXT,
    "adminNotes" TEXT,
    "statementIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "minimumWithdrawalAmount" DECIMAL(12,2) NOT NULL DEFAULT 50,
    "emailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "submittedByEmail" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "details" JSONB,
    "placementDealId" TEXT,
    "advanceType" "AdvanceType",
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_payouts" (
    "id" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "workOrderNumber" TEXT,
    "artistName" TEXT NOT NULL,
    "songTitles" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "finishTime" TEXT NOT NULL,
    "totalHours" DECIMAL(5,2) NOT NULL,
    "studioName" TEXT NOT NULL,
    "trackingEngineer" TEXT NOT NULL,
    "assistantEngineer" TEXT,
    "mixEngineer" TEXT,
    "masteringEngineer" TEXT,
    "sessionNotes" TEXT,
    "masterLink" TEXT NOT NULL,
    "sessionFilesLink" TEXT NOT NULL,
    "beatStemsLink" TEXT NOT NULL,
    "beatLink" TEXT NOT NULL,
    "sampleInfo" TEXT,
    "midiPresetsLink" TEXT,
    "studioRateType" TEXT NOT NULL,
    "studioRate" DECIMAL(10,2) NOT NULL,
    "engineerRateType" TEXT NOT NULL,
    "engineerRate" DECIMAL(10,2) NOT NULL,
    "paymentSplit" TEXT NOT NULL,
    "depositPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "studioCost" DECIMAL(10,2) NOT NULL,
    "engineerFee" DECIMAL(10,2) NOT NULL,
    "totalSessionCost" DECIMAL(10,2) NOT NULL,
    "payoutAmount" DECIMAL(10,2) NOT NULL,
    "status" "SessionPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "submittedByEmail" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "tier" "GamificationTier" NOT NULL DEFAULT 'BRONZE',
    "lastCheckIn" TIMESTAMP(3),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "GamificationEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "adminId" TEXT,
    "adminReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "roleRestriction" TEXT,
    "tierRestriction" "GamificationTier",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inventory" INTEGER,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNotes" TEXT,
    "appliedToPayoutId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 10,
    "streakDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "description" TEXT,
    "subject" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3),
    "lastReadMsgId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "fileMimeType" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "replyToId" TEXT,
    "reactions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "type" "ToolSubscriptionType" NOT NULL,
    "status" "ToolSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "usesRemaining" INTEGER NOT NULL DEFAULT 0,
    "usesTotal" INTEGER NOT NULL DEFAULT 0,
    "usesUsed" INTEGER NOT NULL DEFAULT 0,
    "tourMilesCost" INTEGER,
    "redemptionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "grantReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "nickname" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'SIMPLE',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "saleStart" TIMESTAMP(3),
    "saleEnd" TIMESTAMP(3),
    "sku" TEXT,
    "stockQuantity" INTEGER,
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "lowStockThreshold" INTEGER DEFAULT 5,
    "subscriptionInterval" "ShopSubscriptionInterval",
    "subscriptionIntervalCount" INTEGER DEFAULT 1,
    "trialDays" INTEGER DEFAULT 0,
    "stripeProductId" TEXT,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_to_categories" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "product_to_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isVariation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "sku" TEXT,
    "stockQuantity" INTEGER,
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_files" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "product_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "referralCode" TEXT,
    "referredByUserId" TEXT,
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
    "stripePaymentIntentId" TEXT,
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
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_downloads" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "downloadsUsed" INTEGER NOT NULL DEFAULT 0,
    "downloadLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDownloadAt" TIMESTAMP(3),

    CONSTRAINT "order_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ShopSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "ShopSubscriptionInterval" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeSubscriptionId" TEXT,
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

    CONSTRAINT "shop_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_permissions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "roles" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
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
    "stripeCouponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "category" TEXT NOT NULL,
    "achievementId" TEXT,
    "rewardId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_borders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "spinSpeed" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "glowIntensity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "specialEffect" TEXT,
    "achievementId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_borders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_borders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borderId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_borders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_contacts" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "category" "BusinessContactCategory" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_articles" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "pinnedBy" TEXT,
    "pinnedAt" TIMESTAMP(3),
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_feed_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "articleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_feed_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MarketplaceListingCategory" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "coverImageUrl" TEXT,
    "audioPreviewUrl" TEXT,
    "fileUrl" TEXT,
    "slug" TEXT NOT NULL,
    "tags" JSONB,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_transactions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "paidAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "ActivityFeedType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "placementId" TEXT,
    "achievementId" TEXT,
    "listingId" TEXT,
    "metadata" JSONB,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layout_presets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "columns" INTEGER NOT NULL DEFAULT 12,
    "rowHeight" INTEGER NOT NULL DEFAULT 80,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layout_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "gridX" INTEGER NOT NULL DEFAULT 0,
    "gridY" INTEGER NOT NULL DEFAULT 0,
    "gridW" INTEGER NOT NULL DEFAULT 2,
    "gridH" INTEGER NOT NULL DEFAULT 2,
    "size" "WidgetSize" NOT NULL DEFAULT 'MEDIUM',
    "config" JSONB,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pomodoro_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "wasCompleted" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pomodoro_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productivity_activities" (
    "id" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productivity_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_api_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "type" "CorporateEntityType" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "CorporateEntityStatus" NOT NULL DEFAULT 'NOT_FORMED',
    "formedDate" TIMESTAMP(3),
    "ein" TEXT,
    "stateFileNumber" TEXT,
    "registeredAgent" TEXT,
    "color" TEXT,
    "biomeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_quests" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "QuestCategory" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'LOCKED',
    "prerequisiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_quest_steps" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "QuestStepStatus" NOT NULL DEFAULT 'PENDING',
    "actionType" "QuestStepActionType" NOT NULL,
    "actionData" JSONB,
    "requiresUpload" BOOLEAN NOT NULL DEFAULT false,
    "documentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_quest_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_documents" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CorporateDocumentCategory" NOT NULL,
    "status" "CorporateDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "ComplianceFrequency" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "reminderDays" INTEGER NOT NULL DEFAULT 30,
    "status" "ComplianceItemStatus" NOT NULL DEFAULT 'UPCOMING',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "documentId" TEXT,
    "lastCompletedAt" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_user_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "questsCompleted" INTEGER NOT NULL DEFAULT 0,
    "documentsUploaded" INTEGER NOT NULL DEFAULT 0,
    "complianceStreak" INTEGER NOT NULL DEFAULT 0,
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firmaTemplateId" TEXT NOT NULL,
    "firmaWorkspaceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "userId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "firmaSigningRequestId" TEXT NOT NULL,
    "firmaSigningUrl" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "signedDocumentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_avatars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configJson" JSONB NOT NULL,
    "bodyType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeAccountId_key" ON "users"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_profileSlug_key" ON "users"("profileSlug");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "producers_userId_key" ON "producers"("userId");

-- CreateIndex
CREATE INDEX "producers_writerIpiNumber_idx" ON "producers"("writerIpiNumber");

-- CreateIndex
CREATE INDEX "producers_publisherIpiNumber_idx" ON "producers"("publisherIpiNumber");

-- CreateIndex
CREATE INDEX "producers_proAffiliation_idx" ON "producers"("proAffiliation");

-- CreateIndex
CREATE INDEX "statements_proType_idx" ON "statements"("proType");

-- CreateIndex
CREATE INDEX "statements_status_idx" ON "statements"("status");

-- CreateIndex
CREATE INDEX "statements_paymentStatus_idx" ON "statements"("paymentStatus");

-- CreateIndex
CREATE INDEX "statements_uploadDate_idx" ON "statements"("uploadDate");

-- CreateIndex
CREATE INDEX "statement_items_statementId_idx" ON "statement_items"("statementId");

-- CreateIndex
CREATE INDEX "statement_items_userId_idx" ON "statement_items"("userId");

-- CreateIndex
CREATE INDEX "statement_items_producerId_idx" ON "statement_items"("producerId");

-- CreateIndex
CREATE INDEX "statement_items_workTitle_idx" ON "statement_items"("workTitle");

-- CreateIndex
CREATE INDEX "statement_items_isVisibleToWriter_idx" ON "statement_items"("isVisibleToWriter");

-- CreateIndex
CREATE INDEX "applications_email_idx" ON "applications"("email");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_tier_idx" ON "applications"("tier");

-- CreateIndex
CREATE INDEX "applications_score_idx" ON "applications"("score");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_priority_idx" ON "opportunities"("priority");

-- CreateIndex
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");

-- CreateIndex
CREATE INDEX "consultations_email_idx" ON "consultations"("email");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "placements_caseNumber_key" ON "placements"("caseNumber");

-- CreateIndex
CREATE INDEX "placements_userId_idx" ON "placements"("userId");

-- CreateIndex
CREATE INDEX "placements_isrc_idx" ON "placements"("isrc");

-- CreateIndex
CREATE INDEX "placements_spotifyTrackId_idx" ON "placements"("spotifyTrackId");

-- CreateIndex
CREATE INDEX "placements_platform_idx" ON "placements"("platform");

-- CreateIndex
CREATE INDEX "placements_status_idx" ON "placements"("status");

-- CreateIndex
CREATE INDEX "placements_genre_idx" ON "placements"("genre");

-- CreateIndex
CREATE INDEX "placements_audioDbArtistId_idx" ON "placements"("audioDbArtistId");

-- CreateIndex
CREATE INDEX "placements_caseNumber_idx" ON "placements"("caseNumber");

-- CreateIndex
CREATE INDEX "placements_submittedAt_idx" ON "placements"("submittedAt");

-- CreateIndex
CREATE INDEX "placement_credits_placementId_idx" ON "placement_credits"("placementId");

-- CreateIndex
CREATE INDEX "placement_credits_firstName_lastName_idx" ON "placement_credits"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "placement_credits_userId_idx" ON "placement_credits"("userId");

-- CreateIndex
CREATE INDEX "placement_credits_ipiNumber_idx" ON "placement_credits"("ipiNumber");

-- CreateIndex
CREATE INDEX "placement_credits_publisherIpiNumber_idx" ON "placement_credits"("publisherIpiNumber");

-- CreateIndex
CREATE UNIQUE INDEX "placement_deals_billingInvoiceNumber_key" ON "placement_deals"("billingInvoiceNumber");

-- CreateIndex
CREATE INDEX "placement_deals_clientFullName_idx" ON "placement_deals"("clientFullName");

-- CreateIndex
CREATE INDEX "placement_deals_songTitle_idx" ON "placement_deals"("songTitle");

-- CreateIndex
CREATE INDEX "placement_deals_status_idx" ON "placement_deals"("status");

-- CreateIndex
CREATE INDEX "placement_deals_billingInvoiceNumber_idx" ON "placement_deals"("billingInvoiceNumber");

-- CreateIndex
CREATE INDEX "credits_userId_idx" ON "credits"("userId");

-- CreateIndex
CREATE INDEX "credits_songTitle_idx" ON "credits"("songTitle");

-- CreateIndex
CREATE INDEX "credits_ipiNumber_idx" ON "credits"("ipiNumber");

-- CreateIndex
CREATE INDEX "pro_submissions_userId_idx" ON "pro_submissions"("userId");

-- CreateIndex
CREATE INDEX "pro_submissions_proName_idx" ON "pro_submissions"("proName");

-- CreateIndex
CREATE INDEX "pro_submissions_submittedAt_idx" ON "pro_submissions"("submittedAt");

-- CreateIndex
CREATE INDEX "advance_scenarios_userId_idx" ON "advance_scenarios"("userId");

-- CreateIndex
CREATE INDEX "advance_scenarios_createdAt_idx" ON "advance_scenarios"("createdAt");

-- CreateIndex
CREATE INDEX "documents_uploadedById_idx" ON "documents"("uploadedById");

-- CreateIndex
CREATE INDEX "documents_relatedUserId_idx" ON "documents"("relatedUserId");

-- CreateIndex
CREATE INDEX "documents_statementId_idx" ON "documents"("statementId");

-- CreateIndex
CREATE INDEX "documents_placementId_idx" ON "documents"("placementId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_visibility_idx" ON "documents"("visibility");

-- CreateIndex
CREATE INDEX "commission_settings_isActive_idx" ON "commission_settings"("isActive");

-- CreateIndex
CREATE INDEX "commission_settings_effectiveDate_idx" ON "commission_settings"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "producer_tour_publishers_ipiNumber_key" ON "producer_tour_publishers"("ipiNumber");

-- CreateIndex
CREATE INDEX "producer_tour_publishers_ipiNumber_idx" ON "producer_tour_publishers"("ipiNumber");

-- CreateIndex
CREATE INDEX "producer_tour_publishers_isActive_idx" ON "producer_tour_publishers"("isActive");

-- CreateIndex
CREATE INDEX "payout_requests_userId_idx" ON "payout_requests"("userId");

-- CreateIndex
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");

-- CreateIndex
CREATE INDEX "payout_requests_requestedAt_idx" ON "payout_requests"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_submittedById_idx" ON "invoices"("submittedById");

-- CreateIndex
CREATE INDEX "invoices_type_idx" ON "invoices"("type");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_placementDealId_idx" ON "invoices"("placementDealId");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "session_payouts_submittedById_idx" ON "session_payouts"("submittedById");

-- CreateIndex
CREATE INDEX "session_payouts_status_idx" ON "session_payouts"("status");

-- CreateIndex
CREATE INDEX "session_payouts_sessionDate_idx" ON "session_payouts"("sessionDate");

-- CreateIndex
CREATE INDEX "session_payouts_createdAt_idx" ON "session_payouts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_points_userId_key" ON "gamification_points"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_points_referralCode_key" ON "gamification_points"("referralCode");

-- CreateIndex
CREATE INDEX "gamification_points_userId_idx" ON "gamification_points"("userId");

-- CreateIndex
CREATE INDEX "gamification_points_tier_idx" ON "gamification_points"("tier");

-- CreateIndex
CREATE INDEX "gamification_points_points_idx" ON "gamification_points"("points");

-- CreateIndex
CREATE INDEX "gamification_events_userId_idx" ON "gamification_events"("userId");

-- CreateIndex
CREATE INDEX "gamification_events_eventType_idx" ON "gamification_events"("eventType");

-- CreateIndex
CREATE INDEX "gamification_events_createdAt_idx" ON "gamification_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_tier_idx" ON "achievements"("tier");

-- CreateIndex
CREATE INDEX "achievements_isActive_idx" ON "achievements"("isActive");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "rewards_category_idx" ON "rewards"("category");

-- CreateIndex
CREATE INDEX "rewards_roleRestriction_idx" ON "rewards"("roleRestriction");

-- CreateIndex
CREATE INDEX "rewards_tierRestriction_idx" ON "rewards"("tierRestriction");

-- CreateIndex
CREATE INDEX "rewards_isActive_idx" ON "rewards"("isActive");

-- CreateIndex
CREATE INDEX "reward_redemptions_userId_idx" ON "reward_redemptions"("userId");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions"("status");

-- CreateIndex
CREATE INDEX "reward_redemptions_appliedToPayoutId_idx" ON "reward_redemptions"("appliedToPayoutId");

-- CreateIndex
CREATE INDEX "social_shares_userId_idx" ON "social_shares"("userId");

-- CreateIndex
CREATE INDEX "social_shares_platform_idx" ON "social_shares"("platform");

-- CreateIndex
CREATE INDEX "daily_check_ins_userId_idx" ON "daily_check_ins"("userId");

-- CreateIndex
CREATE INDEX "daily_check_ins_checkInDate_idx" ON "daily_check_ins"("checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_check_ins_userId_checkInDate_key" ON "daily_check_ins"("userId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_config_key_key" ON "gamification_config"("key");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_isClosed_idx" ON "conversations"("isClosed");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE INDEX "conversation_participants_lastReadAt_idx" ON "conversation_participants"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_replyToId_idx" ON "messages"("replyToId");

-- CreateIndex
CREATE INDEX "tool_subscriptions_userId_idx" ON "tool_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "tool_subscriptions_toolId_idx" ON "tool_subscriptions"("toolId");

-- CreateIndex
CREATE INDEX "tool_subscriptions_status_idx" ON "tool_subscriptions"("status");

-- CreateIndex
CREATE INDEX "tool_subscriptions_expiresAt_idx" ON "tool_subscriptions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "tool_subscriptions_userId_toolId_type_key" ON "tool_subscriptions"("userId", "toolId", "type");

-- CreateIndex
CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");

-- CreateIndex
CREATE INDEX "contacts_contactId_idx" ON "contacts"("contactId");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_contactId_key" ON "contacts"("userId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_slug_idx" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_parentId_idx" ON "product_categories"("parentId");

-- CreateIndex
CREATE INDEX "product_categories_isActive_idx" ON "product_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_stripeProductId_key" ON "products"("stripeProductId");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_stripeProductId_idx" ON "products"("stripeProductId");

-- CreateIndex
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");

-- CreateIndex
CREATE INDEX "product_to_categories_productId_idx" ON "product_to_categories"("productId");

-- CreateIndex
CREATE INDEX "product_to_categories_categoryId_idx" ON "product_to_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_to_categories_productId_categoryId_key" ON "product_to_categories"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "product_attributes_productId_idx" ON "product_attributes"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variations_sku_key" ON "product_variations"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variations_stripePriceId_key" ON "product_variations"("stripePriceId");

-- CreateIndex
CREATE INDEX "product_variations_productId_idx" ON "product_variations"("productId");

-- CreateIndex
CREATE INDEX "product_variations_stripePriceId_idx" ON "product_variations"("stripePriceId");

-- CreateIndex
CREATE INDEX "product_files_productId_idx" ON "product_files"("productId");

-- CreateIndex
CREATE INDEX "product_files_variationId_idx" ON "product_files"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_email_idx" ON "orders"("email");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_stripePaymentIntentId_idx" ON "orders"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_referralCode_idx" ON "orders"("referralCode");

-- CreateIndex
CREATE INDEX "orders_referredByUserId_idx" ON "orders"("referredByUserId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_variationId_idx" ON "order_items"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "order_downloads_accessToken_key" ON "order_downloads"("accessToken");

-- CreateIndex
CREATE INDEX "order_downloads_orderId_idx" ON "order_downloads"("orderId");

-- CreateIndex
CREATE INDEX "order_downloads_fileId_idx" ON "order_downloads"("fileId");

-- CreateIndex
CREATE INDEX "order_downloads_accessToken_idx" ON "order_downloads"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "order_downloads_orderId_fileId_key" ON "order_downloads"("orderId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_subscriptions_stripeSubscriptionId_key" ON "shop_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "shop_subscriptions_userId_idx" ON "shop_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "shop_subscriptions_productId_idx" ON "shop_subscriptions"("productId");

-- CreateIndex
CREATE INDEX "shop_subscriptions_status_idx" ON "shop_subscriptions"("status");

-- CreateIndex
CREATE INDEX "shop_subscriptions_stripeSubscriptionId_idx" ON "shop_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_permissions_toolId_key" ON "tool_permissions"("toolId");

-- CreateIndex
CREATE INDEX "tool_permissions_toolId_idx" ON "tool_permissions"("toolId");

-- CreateIndex
CREATE INDEX "tool_permissions_isActive_idx" ON "tool_permissions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_stripeCouponId_key" ON "coupons"("stripeCouponId");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");

-- CreateIndex
CREATE INDEX "coupons_stripeCouponId_idx" ON "coupons"("stripeCouponId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badges_achievementId_key" ON "badges"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_rewardId_key" ON "badges"("rewardId");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "badges"("category");

-- CreateIndex
CREATE INDEX "badges_rarity_idx" ON "badges"("rarity");

-- CreateIndex
CREATE INDEX "badges_isActive_idx" ON "badges"("isActive");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE INDEX "user_badges_badgeId_idx" ON "user_badges"("badgeId");

-- CreateIndex
CREATE INDEX "user_badges_isEquipped_idx" ON "user_badges"("isEquipped");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_borders_name_key" ON "profile_borders"("name");

-- CreateIndex
CREATE UNIQUE INDEX "profile_borders_achievementId_key" ON "profile_borders"("achievementId");

-- CreateIndex
CREATE INDEX "profile_borders_tier_idx" ON "profile_borders"("tier");

-- CreateIndex
CREATE INDEX "profile_borders_isActive_idx" ON "profile_borders"("isActive");

-- CreateIndex
CREATE INDEX "user_borders_userId_idx" ON "user_borders"("userId");

-- CreateIndex
CREATE INDEX "user_borders_borderId_idx" ON "user_borders"("borderId");

-- CreateIndex
CREATE INDEX "user_borders_isEquipped_idx" ON "user_borders"("isEquipped");

-- CreateIndex
CREATE UNIQUE INDEX "user_borders_userId_borderId_key" ON "user_borders"("userId", "borderId");

-- CreateIndex
CREATE INDEX "business_contacts_category_idx" ON "business_contacts"("category");

-- CreateIndex
CREATE INDEX "business_contacts_companyName_idx" ON "business_contacts"("companyName");

-- CreateIndex
CREATE INDEX "business_contacts_email_idx" ON "business_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "insight_articles_url_key" ON "insight_articles"("url");

-- CreateIndex
CREATE INDEX "insight_articles_category_idx" ON "insight_articles"("category");

-- CreateIndex
CREATE INDEX "insight_articles_source_idx" ON "insight_articles"("source");

-- CreateIndex
CREATE INDEX "insight_articles_isPinned_idx" ON "insight_articles"("isPinned");

-- CreateIndex
CREATE INDEX "insight_articles_publishedAt_idx" ON "insight_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "insight_articles_fetchedAt_idx" ON "insight_articles"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "insight_feed_sources_name_key" ON "insight_feed_sources"("name");

-- CreateIndex
CREATE INDEX "insight_feed_sources_isActive_idx" ON "insight_feed_sources"("isActive");

-- CreateIndex
CREATE INDEX "insight_feed_sources_category_idx" ON "insight_feed_sources"("category");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_slug_key" ON "marketplace_listings"("slug");

-- CreateIndex
CREATE INDEX "marketplace_listings_userId_idx" ON "marketplace_listings"("userId");

-- CreateIndex
CREATE INDEX "marketplace_listings_category_idx" ON "marketplace_listings"("category");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings"("status");

-- CreateIndex
CREATE INDEX "marketplace_listings_createdAt_idx" ON "marketplace_listings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_transactions_stripePaymentIntentId_key" ON "marketplace_transactions"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "marketplace_transactions_listingId_idx" ON "marketplace_transactions"("listingId");

-- CreateIndex
CREATE INDEX "marketplace_transactions_buyerId_idx" ON "marketplace_transactions"("buyerId");

-- CreateIndex
CREATE INDEX "marketplace_transactions_sellerId_idx" ON "marketplace_transactions"("sellerId");

-- CreateIndex
CREATE INDEX "marketplace_transactions_createdAt_idx" ON "marketplace_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "activity_feed_items_userId_idx" ON "activity_feed_items"("userId");

-- CreateIndex
CREATE INDEX "activity_feed_items_activityType_idx" ON "activity_feed_items"("activityType");

-- CreateIndex
CREATE INDEX "activity_feed_items_createdAt_idx" ON "activity_feed_items"("createdAt");

-- CreateIndex
CREATE INDEX "activity_feed_items_isPublic_idx" ON "activity_feed_items"("isPublic");

-- CreateIndex
CREATE INDEX "feed_likes_feedItemId_idx" ON "feed_likes"("feedItemId");

-- CreateIndex
CREATE INDEX "feed_likes_userId_idx" ON "feed_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feed_likes_userId_feedItemId_key" ON "feed_likes"("userId", "feedItemId");

-- CreateIndex
CREATE INDEX "feed_comments_feedItemId_parentId_createdAt_idx" ON "feed_comments"("feedItemId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "feed_comments_userId_idx" ON "feed_comments"("userId");

-- CreateIndex
CREATE INDEX "feed_comments_parentId_idx" ON "feed_comments"("parentId");

-- CreateIndex
CREATE INDEX "comment_likes_commentId_idx" ON "comment_likes"("commentId");

-- CreateIndex
CREATE INDEX "comment_likes_userId_idx" ON "comment_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_userId_commentId_key" ON "comment_likes"("userId", "commentId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "dashboard_layout_presets_userId_idx" ON "dashboard_layout_presets"("userId");

-- CreateIndex
CREATE INDEX "dashboard_layout_presets_isActive_idx" ON "dashboard_layout_presets"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layout_presets_userId_name_key" ON "dashboard_layout_presets"("userId", "name");

-- CreateIndex
CREATE INDEX "dashboard_widgets_userId_idx" ON "dashboard_widgets"("userId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widgetType_idx" ON "dashboard_widgets"("widgetType");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widgets_userId_widgetType_key" ON "dashboard_widgets"("userId", "widgetType");

-- CreateIndex
CREATE UNIQUE INDEX "admin_notes_userId_key" ON "admin_notes"("userId");

-- CreateIndex
CREATE INDEX "daily_goals_userId_date_idx" ON "daily_goals"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_goals_userId_date_title_key" ON "daily_goals"("userId", "date", "title");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_userId_idx" ON "pomodoro_sessions"("userId");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_startedAt_idx" ON "pomodoro_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "productivity_activities_activityType_idx" ON "productivity_activities"("activityType");

-- CreateIndex
CREATE INDEX "productivity_activities_createdAt_idx" ON "productivity_activities"("createdAt");

-- CreateIndex
CREATE INDEX "productivity_activities_actorId_idx" ON "productivity_activities"("actorId");

-- CreateIndex
CREATE INDEX "external_api_credentials_userId_idx" ON "external_api_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "external_api_credentials_userId_provider_key" ON "external_api_credentials"("userId", "provider");

-- CreateIndex
CREATE INDEX "corporate_entities_status_idx" ON "corporate_entities"("status");

-- CreateIndex
CREATE INDEX "corporate_quests_entityId_idx" ON "corporate_quests"("entityId");

-- CreateIndex
CREATE INDEX "corporate_quests_status_idx" ON "corporate_quests"("status");

-- CreateIndex
CREATE INDEX "corporate_quests_category_idx" ON "corporate_quests"("category");

-- CreateIndex
CREATE INDEX "corporate_quest_steps_questId_idx" ON "corporate_quest_steps"("questId");

-- CreateIndex
CREATE INDEX "corporate_quest_steps_status_idx" ON "corporate_quest_steps"("status");

-- CreateIndex
CREATE INDEX "corporate_documents_entityId_idx" ON "corporate_documents"("entityId");

-- CreateIndex
CREATE INDEX "corporate_documents_category_idx" ON "corporate_documents"("category");

-- CreateIndex
CREATE INDEX "corporate_documents_status_idx" ON "corporate_documents"("status");

-- CreateIndex
CREATE INDEX "compliance_items_entityId_idx" ON "compliance_items"("entityId");

-- CreateIndex
CREATE INDEX "compliance_items_status_idx" ON "compliance_items"("status");

-- CreateIndex
CREATE INDEX "compliance_items_dueDate_idx" ON "compliance_items"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_user_progress_userId_key" ON "corporate_user_progress"("userId");

-- CreateIndex
CREATE INDEX "corporate_user_progress_userId_idx" ON "corporate_user_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_templates_firmaTemplateId_key" ON "agreement_templates"("firmaTemplateId");

-- CreateIndex
CREATE INDEX "agreement_templates_status_idx" ON "agreement_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_firmaSigningRequestId_key" ON "agreements"("firmaSigningRequestId");

-- CreateIndex
CREATE INDEX "agreements_templateId_idx" ON "agreements"("templateId");

-- CreateIndex
CREATE INDEX "agreements_applicationId_idx" ON "agreements"("applicationId");

-- CreateIndex
CREATE INDEX "agreements_userId_idx" ON "agreements"("userId");

-- CreateIndex
CREATE INDEX "agreements_status_idx" ON "agreements"("status");

-- CreateIndex
CREATE INDEX "agreements_firmaSigningRequestId_idx" ON "agreements"("firmaSigningRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_userId_key" ON "user_avatars"("userId");

-- CreateIndex
CREATE INDEX "user_avatars_userId_idx" ON "user_avatars"("userId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producers" ADD CONSTRAINT "producers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_paymentProcessedById_fkey" FOREIGN KEY ("paymentProcessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_credits" ADD CONSTRAINT "placement_credits_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "placements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_credits" ADD CONSTRAINT "placement_credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_submissions" ADD CONSTRAINT "pro_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_scenarios" ADD CONSTRAINT "advance_scenarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "placements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_placementDealId_fkey" FOREIGN KEY ("placementDealId") REFERENCES "placement_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payouts" ADD CONSTRAINT "session_payouts_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payouts" ADD CONSTRAINT "session_payouts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_points" ADD CONSTRAINT "gamification_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_check_ins" ADD CONSTRAINT "daily_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_subscriptions" ADD CONSTRAINT "tool_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_to_categories" ADD CONSTRAINT "product_to_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_to_categories" ADD CONSTRAINT "product_to_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_downloads" ADD CONSTRAINT "order_downloads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_downloads" ADD CONSTRAINT "order_downloads_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "product_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_subscriptions" ADD CONSTRAINT "shop_subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_borders" ADD CONSTRAINT "profile_borders_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_borders" ADD CONSTRAINT "user_borders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_borders" ADD CONSTRAINT "user_borders_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "profile_borders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_quests" ADD CONSTRAINT "corporate_quests_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "corporate_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_quest_steps" ADD CONSTRAINT "corporate_quest_steps_questId_fkey" FOREIGN KEY ("questId") REFERENCES "corporate_quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_documents" ADD CONSTRAINT "corporate_documents_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "corporate_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "corporate_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "agreement_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
