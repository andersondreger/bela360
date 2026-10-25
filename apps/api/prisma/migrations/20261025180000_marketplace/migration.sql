-- CreateEnum
CREATE TYPE "DistributorStatus" AS ENUM ('ATIVO', 'EM_NEGOCIACAO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "MarketplaceCategory" AS ENUM ('CABELO', 'ESTETICA_FACIAL', 'CORPORAL', 'DESCARTAVEIS', 'EQUIPAMENTOS');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('RECEBIDO', 'PAGO', 'ENVIADO', 'ENTREGUE', 'CASHBACK_LIBERADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('AGUARDANDO', 'LIQUIDADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDENTE', 'PAGO', 'ESTORNADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CASHBACK_PREVISTO', 'CASHBACK_LIBERADO', 'USO_DE_SALDO', 'CANCELAMENTO', 'ESTORNO');

-- CreateTable
CREATE TABLE "marketplace_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "cashbackSharePct" INTEGER NOT NULL DEFAULT 50,
    "walletLimitPct" INTEGER NOT NULL DEFAULT 30,
    "returnDays" INTEGER NOT NULL DEFAULT 7,
    "feeBp" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_distributors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "commissionBp" INTEGER NOT NULL,
    "payDays" INTEGER NOT NULL DEFAULT 30,
    "status" "DistributorStatus" NOT NULL DEFAULT 'EM_NEGOCIACAO',
    "asaasWalletId" TEXT,
    "walletCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_products" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MarketplaceCategory" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_checkouts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "walletUsedCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDENTE',
    "gateway" TEXT NOT NULL DEFAULT 'simulado',
    "gatewayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'RECEBIDO',
    "splitStatus" "SplitStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "subtotalCents" INTEGER NOT NULL,
    "walletUsedCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL,
    "commissionBp" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "cashbackCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "releaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "marketplace_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_ledger" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_audit" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_products_distributorId_idx" ON "marketplace_products"("distributorId");

-- CreateIndex
CREATE INDEX "marketplace_products_category_active_idx" ON "marketplace_products"("category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_checkouts_gatewayPaymentId_key" ON "marketplace_checkouts"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "marketplace_checkouts_businessId_idx" ON "marketplace_checkouts"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_number_key" ON "marketplace_orders"("number");

-- CreateIndex
CREATE INDEX "marketplace_orders_businessId_createdAt_idx" ON "marketplace_orders"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_orders_status_releaseAt_idx" ON "marketplace_orders"("status", "releaseAt");

-- CreateIndex
CREATE INDEX "marketplace_orders_distributorId_idx" ON "marketplace_orders"("distributorId");

-- CreateIndex
CREATE INDEX "marketplace_order_items_orderId_idx" ON "marketplace_order_items"("orderId");

-- CreateIndex
CREATE INDEX "cashback_ledger_businessId_createdAt_idx" ON "cashback_ledger"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_ledger_orderId_type_key" ON "cashback_ledger"("orderId", "type");

-- CreateIndex
CREATE INDEX "marketplace_audit_entity_entityId_idx" ON "marketplace_audit"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "marketplace_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_checkouts" ADD CONSTRAINT "marketplace_checkouts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "marketplace_checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "marketplace_distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_ledger" ADD CONSTRAINT "cashback_ledger_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_ledger" ADD CONSTRAINT "cashback_ledger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ledger append-only: nenhum lancamento pode ser editado ou apagado, so compensado por outro.
CREATE OR REPLACE FUNCTION cashback_ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'cashback_ledger e append-only: crie um lancamento compensatorio';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cashback_ledger_no_update_delete
  BEFORE UPDATE OR DELETE ON cashback_ledger
  FOR EACH ROW EXECUTE FUNCTION cashback_ledger_append_only();

-- Regras globais iniciais (padrao do prompt: 50% / 30% / 7 dias / 3%).
INSERT INTO marketplace_config (id, "updatedAt") VALUES ('default', now()) ON CONFLICT DO NOTHING;

-- Valores monetarios nunca negativos / percentuais dentro da faixa.
ALTER TABLE cashback_ledger ADD CONSTRAINT cashback_ledger_amount_pos CHECK ("amountCents" > 0);
ALTER TABLE marketplace_products ADD CONSTRAINT marketplace_products_price_pos CHECK ("priceCents" > 0);
ALTER TABLE marketplace_distributors ADD CONSTRAINT marketplace_distributors_comm CHECK ("commissionBp" BETWEEN 0 AND 10000);
