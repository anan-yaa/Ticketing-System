-- CreateTable
CREATE TABLE "MasterCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterQueue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterCategory_name_key" ON "MasterCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MasterType_name_key" ON "MasterType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MasterQueue_name_key" ON "MasterQueue"("name");
