-- Remove customerName column from ScheduledTask
-- Tasks are now global automation blueprints, not bound to a specific customer
ALTER TABLE "ScheduledTask" DROP COLUMN IF EXISTS "customerName";
