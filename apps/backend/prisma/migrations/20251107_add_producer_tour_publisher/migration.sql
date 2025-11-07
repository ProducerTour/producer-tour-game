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

-- CreateIndex
CREATE UNIQUE INDEX "producer_tour_publishers_ipiNumber_key" ON "producer_tour_publishers"("ipiNumber");

-- CreateIndex
CREATE INDEX "producer_tour_publishers_ipiNumber_idx" ON "producer_tour_publishers"("ipiNumber");

-- CreateIndex
CREATE INDEX "producer_tour_publishers_isActive_idx" ON "producer_tour_publishers"("isActive");
