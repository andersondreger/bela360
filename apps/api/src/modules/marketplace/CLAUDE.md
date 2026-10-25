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
- **Asaas (Fase 2)** (`asaas.gateway.ts`, `marketplace.webhook.ts`): credenciais PROPRIAS `MARKETPLACE_ASAAS_*` (a chave `ASAAS_*` e da assinatura SaaS e esta em producao; nunca reutilizar). Um pagamento por checkout na conta da Bela 360 com `split` = um item por distribuidor (`walletId`, `fixedValue` = pago - comissao, 2 casas); a carteira da Bela nunca entra. Split <= liquido (estimado antes, real conferido com o `netValue` da resposta; se passar, a cobranca e apagada). Cliente precisa de CPF/CNPJ em `Business.document`.
- **Webhook** `POST /api/marketplace/webhooks/asaas` (header `asaas-access-token`): id do evento = PK em `marketplace_webhook_events` (duplicado = ignorado; falha libera o id para o Asaas reenviar). CONFIRMED -> pago (split aguardando; taxa real substitui a estimada), RECEIVED -> split liquidado, REFUNDED -> desfaz pedidos, DELETED/OVERDUE sem pagamento -> cancela checkout e devolve saldo, SPLIT_DIVERGENCE_BLOCK(_FINISHED)/PARTIALLY_REFUNDED -> so auditoria. Sem polling. Estorno de pedido ja com cashback liberado via gateway: audita `order.refund.needs-approval` (sem retry infinito).
- **walletId**: o Asaas nao oferece consulta publica de carteira de terceiros; validamos o formato (UUID) ao ativar e o Asaas recusa carteira inexistente na criacao da cobranca (nada e cobrado, pedido local e desfeito).
- **Gateway**: `MARKETPLACE_GATEWAY=simulado` (Fase 1) confirma pagamento por `POST /checkout/:id/simulate-pay` (404 quando `asaas`).

## Desvios conscientes do prompt original
- Sem Zustand (carrinho em `useState` + localStorage) e sem RLS do Supabase: o bela360 usa Postgres proprio + Prisma; isolamento por `businessId` no servidor, coberto por teste de integracao. RLS no Postgres pode entrar na Fase 4.
- "Distribuidores" e "Configuracoes" (comissao, cashback, limites) ficam so na visao CEO; o cliente ve o proprio financeiro e cashback.

## Testes
- `npx vitest run` (regras puras, sempre).
- Integracao com banco real: `MK_TEST_DATABASE_URL=postgresql://... npx vitest run marketplace.integration` (Postgres descartavel com `prisma migrate deploy`).

## Pendente
- Fase 2: codigo pronto e testado contra Asaas simulado; falta rodar no sandbox REAL (chave + webhook) e conferir estorno parcial com split.
- Fase 3: Mensagens (WhatsApp Cloud API oficial + e-mail, chave unica pedido+tipo+canal), taxa real do Asaas.
- Fase 4: revisao de seguranca, RLS, deploy.
