/*
  Warnings:

  - The values [PENDING,WAITING] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `MasterQueue` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ticketSeq]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `resolutionDeadline` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ttfrDeadline` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('WORK_IN_PROGRESS', 'WAITING_FOR_APPROVAL', 'WAITING_FOR_AGENT', 'WAITING_FOR_VENDOR', 'WAITING_FOR_CUSTOMER', 'ON_HOLD', 'UNDER_OBSERVATION', 'NONE');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('CLIENT_REPLY', 'AGENT_REPLY', 'INTERNAL_NOTE', 'SYSTEM_EVENT');

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'SCHEDULED');
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "public"."TicketStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "type" "CommentType" NOT NULL DEFAULT 'CLIENT_REPLY',
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "accumulatedPausedTime" INTEGER DEFAULT 0,
ADD COLUMN     "cronExpression" TEXT,
ADD COLUMN     "executeAt" TIMESTAMP(3),
ADD COLUMN     "firstRespondedAt" TIMESTAMP(3),
ADD COLUMN     "isRecurring" BOOLEAN DEFAULT false,
ADD COLUMN     "isResolutionBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTtfrBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPausedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "resolutionDeadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "resolutionTargetMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "responseTargetMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "schedulingReason" TEXT,
ADD COLUMN     "subStatus" "SubStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "ticketSeq" SERIAL NOT NULL,
ADD COLUMN     "ttfrDeadline" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessTier" TEXT;

-- DropTable
DROP TABLE "MasterQueue";

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceContract" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterAssignmentGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT,

    CONSTRAINT "MasterAssignmentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaMatrix" (
    "id" TEXT NOT NULL,
    "priorityTier" TEXT NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaRule" (
    "id" TEXT NOT NULL,
    "serviceGroup" TEXT NOT NULL,
    "ticketType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaTier" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "respH" INTEGER NOT NULL DEFAULT 0,
    "respM" INTEGER NOT NULL DEFAULT 0,
    "resH" INTEGER NOT NULL DEFAULT 0,
    "resM" INTEGER NOT NULL DEFAULT 0,
    "slaRuleId" TEXT NOT NULL,

    CONSTRAINT "SlaTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceContract_name_key" ON "ServiceContract"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MasterAssignmentGroup_name_key" ON "MasterAssignmentGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SlaMatrix_priorityTier_key" ON "SlaMatrix"("priorityTier");

-- CreateIndex
CREATE UNIQUE INDEX "SlaRule_serviceGroup_ticketType_key" ON "SlaRule"("serviceGroup", "ticketType");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketSeq_key" ON "Ticket"("ticketSeq");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterAssignmentGroup" ADD CONSTRAINT "MasterAssignmentGroup_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaTier" ADD CONSTRAINT "SlaTier_slaRuleId_fkey" FOREIGN KEY ("slaRuleId") REFERENCES "SlaRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
