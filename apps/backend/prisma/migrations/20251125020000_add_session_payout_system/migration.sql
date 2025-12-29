-- CreateEnum
CREATE TYPE "SessionPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

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

-- CreateIndex
CREATE INDEX "session_payouts_submittedById_idx" ON "session_payouts"("submittedById");

-- CreateIndex
CREATE INDEX "session_payouts_status_idx" ON "session_payouts"("status");

-- CreateIndex
CREATE INDEX "session_payouts_sessionDate_idx" ON "session_payouts"("sessionDate");

-- CreateIndex
CREATE INDEX "session_payouts_createdAt_idx" ON "session_payouts"("createdAt");

-- AddForeignKey
ALTER TABLE "session_payouts" ADD CONSTRAINT "session_payouts_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_payouts" ADD CONSTRAINT "session_payouts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
