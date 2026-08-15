-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED');

-- CreateTable
CREATE TABLE "marketing_creations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "background" TEXT,
    "status" "CreationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_creations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_creations_businessId_idx" ON "marketing_creations"("businessId");

-- CreateIndex
CREATE INDEX "marketing_creations_businessId_status_idx" ON "marketing_creations"("businessId", "status");

-- AddForeignKey
ALTER TABLE "marketing_creations" ADD CONSTRAINT "marketing_creations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
