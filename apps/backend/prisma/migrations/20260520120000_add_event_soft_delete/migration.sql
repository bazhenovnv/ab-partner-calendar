-- Add soft delete and source identity support for imported/manual events
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "sourcePostId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Event_sourcePostId_key" ON "Event"("sourcePostId");
CREATE INDEX IF NOT EXISTS "Event_deletedAt_idx" ON "Event"("deletedAt");
CREATE INDEX IF NOT EXISTS "Event_sourceUrl_idx" ON "Event"("sourceUrl");
