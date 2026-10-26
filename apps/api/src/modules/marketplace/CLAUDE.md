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

- **Mensagens (Fase 3)** (`messages.service.ts`, `messages.templates.ts`, `messages.providers.ts`): so avisos TRANSACIONAIS do proprio pedido (pago, enviado, entregue, cashback liberado, estornado; `NOVO_PEDIDO` ao distribuidor). Nunca marketing/massa. Fila em `marketplace_messages` com `@@unique([orderId,type,channel,audience])` (retry/webhook repetido nao duplica); enfileirar e enviar ficam FORA das transacoes financeiras (falha de mensagem nunca desfaz dinheiro). Job a cada 1 min, 30 por rodada, 3 tentativas. `MARKETPLACE_MESSAGES`: off | simulado (so registra) | ativo.
  - **Consentimento**: WhatsApp so com opt-in registrado em `marketplace_notify_prefs` (quem e quando; comeca DESLIGADO) e telefone BR valido; e-mail liga por padrao e o cliente pode desligar; distribuidor so por e-mail. Sem consentimento a linha nasce `IGNORADO` com o motivo (auditavel).
  - **WhatsApp**: Cloud API oficial, mensagem iniciada pela empresa = template aprovado. Nomes padrao `bela360_mk_<tipo>` (categoria UTILITY, idioma pt_BR), parametros {{1}}.. na ordem de `WA_VARS`: pedido_pago (nome, pedido, valor), pedido_enviado (nome, pedido, distribuidor), pedido_entregue e cashback_liberado (nome, pedido, cashback), pedido_estornado (nome, pedido, valor), novo_pedido (distribuidor, pedido, valor). CEO pode trocar o nome/texto em `marketplace_message_templates`.
  - **E-mail**: Resend por HTTP (`MARKETPLACE_EMAIL_API_KEY`/`FROM`), sem dependencia nova.

- **Estorno com aprovacao (Fase 4)**: pedido com `CASHBACK_LIBERADO` nunca e estornado direto. `refundOrderWithGateway` (ou o webhook `PAYMENT_REFUNDED`) abre `marketplace_refund_requests` (unico por pedido; `gatewayRefunded` = o Asaas ja devolveu). `decideRefund(APROVAR)` devolve no gateway (se ainda nao devolveu), lanca `CASHBACK_REVERTIDO` (debita o disponivel; pode ficar negativo se ja foi gasto, e `walletUsable` trata como 0) + `ESTORNO` do saldo usado, e marca o pedido ESTORNADO. `REJEITAR` mantem tudo e permite novo pedido. Tudo em `marketplace_audit`. A UI do CEO mostra o quadro "Estornos aguardando sua aprovacao".
- **RLS (Fase 4)** (`tenant.ts`, migration `..._marketplace_rls`): leituras da area do cliente rodam em `tenantRead(businessId, ...)` = `SET LOCAL ROLE marketplace_tenant` (so SELECT) + `app.business_id`; politicas por `businessId` em orders, checkouts, ledger, messages, notify_prefs e order_items. Mesmo sem filtro na consulta o banco so devolve o proprio tenant (teste `marketplace.hardening.test.ts`). O papel da aplicacao (dono) nao e afetado (sem FORCE), entao escritas seguem sob checagem da aplicacao. Toda NOVA leitura de dados de tenant na area do cliente deve usar `tenantRead`.
- **Financeiro so com pedido pago**: `isPaidLive` (pago e nao estornado). Pedido RECEBIDO nao conta como compra, comissao nem cashback ganho (cliente e CEO).
- **Expiracao**: `expireStaleCheckouts` (job a cada 6h) cancela checkouts PENDENTE com mais de 72h e devolve o saldo (com Asaas, apaga a cobranca antes; se recusar, nao cancela).
- **Limites**: `POST /checkout` limitado a 10/min por clinica (cada checkout cria cobranca no gateway). Logs nunca levam credenciais (erros de provedor viram texto simples; o Asaas loga so status e corpo de erro).

## Desvios conscientes do prompt original
- Sem Zustand (carrinho em `useState` + localStorage) e sem RLS do Supabase: o bela360 usa Postgres proprio + Prisma. RLS do Postgres cobre so as LEITURAS do cliente (ver Fase 4); escritas dependem de checagem no servidor porque o checkout toca tabelas globais (distribuidores, produtos).
- "Distribuidores" e "Configuracoes" (comissao, cashback, limites) ficam so na visao CEO; o cliente ve o proprio financeiro e cashback.

## Testes
- `npx vitest run` (regras puras, sempre).
- Integracao com banco real: `MK_TEST_DATABASE_URL=postgresql://... npx vitest run src/modules/marketplace` (Postgres descartavel e VAZIO, com `prisma migrate deploy`; ids fixos dos simuladores colidem se o banco for reaproveitado entre rodadas).

## Pendente
- Fase 2: codigo pronto e testado contra Asaas simulado; falta rodar no sandbox REAL (chave + webhook) e conferir estorno parcial com split.
- Fase 3: codigo pronto e testado contra WhatsApp/e-mail simulados; falta conta Meta Cloud API com os templates aprovados e chave do e-mail para `MARKETPLACE_MESSAGES=ativo`. Taxa real do Asaas ja entra via `netValue`.
- Fase 4: pronta. Pendente de operacao: ligar Asaas sandbox/Meta/e-mail (ver Fase 2/3) e `onDelete: Cascade` de ledger->business conflita com o trigger append-only (excluir uma clinica exige fluxo proprio).
