-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'CASHBACK_REVERTIDO';

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "marketplace_refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "reason" TEXT,
    "source" TEXT NOT NULL,
    "gatewayRefunded" BOOLEAN NOT NULL DEFAULT false,
    "requestedBy" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "marketplace_refund_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketplace_refund_requests_orderId_key" ON "marketplace_refund_requests"("orderId");
CREATE INDEX "marketplace_refund_requests_status_createdAt_idx" ON "marketplace_refund_requests"("status", "createdAt");
