-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('ACTIVE', 'PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StreamingPlatform" AS ENUM ('SPOTIFY', 'APPLE_MUSIC', 'AMAZON_MUSIC', 'YOUTUBE_MUSIC', 'TIDAL', 'DEEZER', 'SOUNDCLOUD', 'OTHER');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_submissions" ADD CONSTRAINT "pro_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
