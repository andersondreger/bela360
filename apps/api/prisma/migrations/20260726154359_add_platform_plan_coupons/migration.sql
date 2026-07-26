-- CreateEnum
CREATE TYPE "PlatformModule" AS ENUM ('MARKETING', 'AUTOMATION', 'LOYALTY', 'INVENTORY');

-- CreateEnum
CREATE TYPE "CommissionPayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "commissionPayoutId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentCount" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "status" "CommissionPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "modules" "PlatformModule"[],
    "durationDays" INTEGER NOT NULL,
    "targetBusinessId" TEXT,
    "businessId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_payouts_businessId_idx" ON "commission_payouts"("businessId");

-- CreateIndex
CREATE INDEX "commission_payouts_professionalId_idx" ON "commission_payouts"("professionalId");

-- CreateIndex
CREATE INDEX "commission_payouts_businessId_professionalId_idx" ON "commission_payouts"("businessId", "professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_coupons_code_key" ON "platform_coupons"("code");

-- CreateIndex
CREATE INDEX "platform_coupons_businessId_idx" ON "platform_coupons"("businessId");

-- CreateIndex
CREATE INDEX "platform_coupons_code_idx" ON "platform_coupons"("code");

-- CreateIndex
CREATE INDEX "payments_commissionPayoutId_idx" ON "payments"("commissionPayoutId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_commissionPayoutId_fkey" FOREIGN KEY ("commissionPayoutId") REFERENCES "commission_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_coupons" ADD CONSTRAINT "platform_coupons_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_coupons" ADD CONSTRAINT "platform_coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
