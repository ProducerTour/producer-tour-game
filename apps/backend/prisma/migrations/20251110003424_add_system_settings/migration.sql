-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "minimumWithdrawalAmount" DECIMAL(12,2) NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
