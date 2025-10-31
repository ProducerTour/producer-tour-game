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

-- CreateIndex
CREATE INDEX "advance_scenarios_userId_idx" ON "advance_scenarios"("userId");

-- CreateIndex
CREATE INDEX "advance_scenarios_createdAt_idx" ON "advance_scenarios"("createdAt");

-- AddForeignKey
ALTER TABLE "advance_scenarios" ADD CONSTRAINT "advance_scenarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
