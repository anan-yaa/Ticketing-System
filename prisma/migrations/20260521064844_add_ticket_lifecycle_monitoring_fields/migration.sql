-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "isSlaBreached" BOOLEAN DEFAULT false,
ADD COLUMN     "respondedAt" TIMESTAMP(3);
