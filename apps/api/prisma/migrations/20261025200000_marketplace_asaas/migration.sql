-- AlterTable
ALTER TABLE "marketplace_checkouts" ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "netValueCents" INTEGER;

-- CreateTable
CREATE TABLE "marketplace_webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "paymentId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_webhook_events_paymentId_idx" ON "marketplace_webhook_events"("paymentId");

