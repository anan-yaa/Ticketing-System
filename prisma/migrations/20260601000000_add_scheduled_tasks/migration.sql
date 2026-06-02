-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduledTask" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dayOfMonth"   INTEGER NOT NULL,
    "hour"         INTEGER NOT NULL DEFAULT 0,
    "minute"       INTEGER NOT NULL DEFAULT 0,
    "customerName" TEXT NOT NULL,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);
