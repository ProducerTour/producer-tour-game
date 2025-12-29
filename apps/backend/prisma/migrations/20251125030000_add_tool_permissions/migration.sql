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

-- CreateIndex
CREATE UNIQUE INDEX "tool_permissions_toolId_key" ON "tool_permissions"("toolId");

-- CreateIndex
CREATE INDEX "tool_permissions_toolId_idx" ON "tool_permissions"("toolId");

-- CreateIndex
CREATE INDEX "tool_permissions_isActive_idx" ON "tool_permissions"("isActive");

-- Seed default tool permissions
INSERT INTO "tool_permissions" ("id", "toolId", "toolName", "roles", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'pub-deal-simulator', 'Pub Deal Simulator', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'consultation-form', 'Consultation Form', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'case-study', 'Case Study', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'royalty-tracker', 'Royalty Portal', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'opportunities', 'Opportunities', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'advance-estimator', 'Advance Estimator', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'placement-tracker', 'Placement Tracker', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'work-registration', 'Work Registration Tool', '["ADMIN", "WRITER", "MANAGER", "LEGAL"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'metadata-index', 'Metadata Index', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'session-payout', 'Session Payout & Delivery', '["ADMIN"]', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'type-beat-video-maker', 'Type Beat Video Maker', '["ADMIN", "WRITER", "CUSTOMER"]', true, NOW(), NOW());
