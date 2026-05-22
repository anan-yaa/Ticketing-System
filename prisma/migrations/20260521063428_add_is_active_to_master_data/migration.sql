-- AlterTable
ALTER TABLE "MasterCategory" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MasterQueue" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MasterType" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
