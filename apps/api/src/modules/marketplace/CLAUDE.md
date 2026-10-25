# Marketplace Bela 360 (cashback + split)

Modulo dentro do monorepo bela360 (Express + Prisma/Postgres, tenant = `Business`). Decisoes de arquitetura:

- **Dinheiro em centavos (Int)**; comissao em pontos-base (12% = 1200). Regras puras em `rules.ts` (testadas em `rules.test.ts`). Nunca float.
- **Escopo**: distribuidores, produtos e regras (`MarketplaceConfig`) sao da PLATAFORMA e geridos pelo CEO. Pedidos, checkouts e ledger sao do tenant; toda rota do cliente filtra por `req.user.businessId` (nunca por id vindo do front).
- **Ledger append-only** (`cashback_ledger`): trigger do Postgres bloqueia UPDATE/DELETE; `@@unique([orderId, type])` torna cada etapa idempotente. Saldo e sempre derivado (`balanceOf`): disponivel = liberado - usado + estorno; a liberar = previsto - liberado - cancelamento.
- **Checkout** (`createCheckout`): trava a linha do tenant (`FOR UPDATE`), recalcula tudo no servidor, gera um pedido por distribuidor ligados a um `MarketplaceCheckout` (um pagamento). Desconto do saldo e repartido por maior resto.
- **Foto das regras no pedido** (`commissionBp`, `cashbackCents`, `feeCents`): mudar regra nao altera pedido antigo.
- **Vendavel** = distribuidor `ATIVO` + `asaasWalletId` preenchido (`distributorSellable`), checado no catalogo e no checkout.
- **Estorno** (`refundOrder`): cancela cashback a liberar, devolve saldo usado, split -> ESTORNADO. Bloqueado depois de `CASHBACK_LIBERADO` (fluxo de aprovacao ainda nao existe). Idempotente.
- **Liberacao**: `releaseDueCashback` (job a cada 6h em `initMarketplaceJobs`; idempotente) libera pedidos ENTREGUE com `releaseAt <= agora`.
- **Visao CEO**: `/api/marketplace/admin/*` aceita super admin logado OU `x-service-token` (= `MARKETPLACE_SERVICE_TOKEN`), usado pelo payments-api do wayia.com.br depois de validar o admin. Auditoria em `marketplace_audit` (distribuidor, regras, estorno).
- **Gateway**: `MARKETPLACE_GATEWAY=simulado` (Fase 1) confirma pagamento por `POST /checkout/:id/simulate-pay` (404 quando `asaas`).

## Desvios conscientes do prompt original
- Sem Zustand (carrinho em `useState` + localStorage) e sem RLS do Supabase: o bela360 usa Postgres proprio + Prisma; isolamento por `businessId` no servidor, coberto por teste de integracao. RLS no Postgres pode entrar na Fase 4.
- "Distribuidores" e "Configuracoes" (comissao, cashback, limites) ficam so na visao CEO; o cliente ve o proprio financeiro e cashback.

## Testes
- `npx vitest run` (regras puras, sempre).
- Integracao com banco real: `MK_TEST_DATABASE_URL=postgresql://... npx vitest run marketplace.integration` (Postgres descartavel com `prisma migrate deploy`).

## Pendente
- Fase 2: Asaas sandbox (cobranca unica + split por walletId, validacao do walletId, webhooks idempotentes com tabela de eventos, estorno no gateway).
- Fase 3: Mensagens (WhatsApp Cloud API oficial + e-mail, chave unica pedido+tipo+canal), taxa real do Asaas.
- Fase 4: revisao de seguranca, RLS, deploy.
