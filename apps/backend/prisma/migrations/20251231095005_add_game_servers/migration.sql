-- CreateTable
CREATE TABLE "game_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3000,
    "region" TEXT NOT NULL,
    "gameMode" TEXT NOT NULL DEFAULT 'free-roam',
    "maxPlayers" INTEGER NOT NULL DEFAULT 50,
    "playerCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_servers_region_idx" ON "game_servers"("region");

-- CreateIndex
CREATE INDEX "game_servers_status_idx" ON "game_servers"("status");
