-- CreateEnum
CREATE TYPE "MarketplaceMessageStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'SIMULADO', 'FALHOU', 'IGNORADO');

-- CreateTable
CREATE TABLE "marketplace_messages" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "toAddress" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "params" JSONB,
    "status" "MarketplaceMessageStatus" NOT NULL DEFAULT 'PENDENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "marketplace_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_message_templates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "waTemplateName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketplace_message_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_notify_prefs" (
    "businessId" TEXT NOT NULL,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptInAt" TIMESTAMP(3),
    "whatsappOptInBy" TEXT,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketplace_notify_prefs_pkey" PRIMARY KEY ("businessId")
);

CREATE UNIQUE INDEX "marketplace_messages_orderId_type_channel_audience_key" ON "marketplace_messages"("orderId", "type", "channel", "audience");
CREATE INDEX "marketplace_messages_status_createdAt_idx" ON "marketplace_messages"("status", "createdAt");
CREATE INDEX "marketplace_messages_businessId_createdAt_idx" ON "marketplace_messages"("businessId", "createdAt");
CREATE UNIQUE INDEX "marketplace_message_templates_type_channel_key" ON "marketplace_message_templates"("type", "channel");
