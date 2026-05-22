-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "affectedDevice" TEXT,
ADD COLUMN     "criticality" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "deviceIp" TEXT,
ADD COLUMN     "firewallCategory" TEXT,
ADD COLUMN     "isScopeInScope" BOOLEAN DEFAULT true,
ADD COLUMN     "queueId" TEXT,
ADD COLUMN     "serviceContract" TEXT,
ADD COLUMN     "slaId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'PORTAL',
ADD COLUMN     "ticketOwnerId" TEXT,
ADD COLUMN     "ticketSource" TEXT,
ADD COLUMN     "ticketType" TEXT,
ADD COLUMN     "timeSpentMin" INTEGER DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
