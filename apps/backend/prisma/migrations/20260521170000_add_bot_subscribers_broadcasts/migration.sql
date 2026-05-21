ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "TelegramSubscriber" (
  "id" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3),
  CONSTRAINT "TelegramSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramSubscriber_telegramUserId_key" ON "TelegramSubscriber"("telegramUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramSubscriber_chatId_key" ON "TelegramSubscriber"("chatId");

CREATE TABLE IF NOT EXISTS "Broadcast" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BroadcastDelivery" (
  "id" TEXT NOT NULL,
  "broadcastId" TEXT NOT NULL,
  "subscriberId" TEXT,
  "chatId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BroadcastDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BroadcastDelivery_broadcastId_idx" ON "BroadcastDelivery"("broadcastId");
CREATE INDEX IF NOT EXISTS "BroadcastDelivery_subscriberId_idx" ON "BroadcastDelivery"("subscriberId");
CREATE INDEX IF NOT EXISTS "BroadcastDelivery_chatId_idx" ON "BroadcastDelivery"("chatId");

DO $$ BEGIN
  ALTER TABLE "BroadcastDelivery" ADD CONSTRAINT "BroadcastDelivery_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BroadcastDelivery" ADD CONSTRAINT "BroadcastDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "TelegramSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
