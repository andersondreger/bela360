# QA Report — bela360

**Data:** 2026-07-26
**Escopo:** Auditoria de código independente (backend `apps/api/src`, frontend `apps/web/src`) comparada aos documentos `docs/architecture.md`, `docs/prd.md`, `docs/STATUS.md`, `docs/situacao-projeto.md`, `docs/promessa-vs-entrega.md` e `docs/stories/*.md`. Revisão apenas — nenhuma alteração de código foi feita durante a auditoria.

## Resumo Executivo

O core de agendamento (Epics 1-5) está tecnicamente presente, mas o isolamento multi-tenant por `businessId` está **quebrado nos módulos mais antigos e centrais do sistema** (`business`, `services`, `clients`, `appointments`): qualquer usuário autenticado de qualquer salão consegue ler, editar ou cancelar dados de outro salão só sabendo o ID do registro, e o módulo WhatsApp permite sequestrar a conexão/QR Code de outro negócio — inclusive existe um endpoint de QR Code do sistema **sem autenticação nenhuma**. Além disso, três módulos inteiros (`professional`, `loyalty`, `inventory`) estão de fato inoperantes em produção por um bug de uma linha (leem `req.userId`/`req.businessId`, que nunca existem — o middleware só popula `req.user.userId`/`req.user.businessId`), o que explica por que os docs internos os classificam como "não implementados". No frontend, a esmagadora maioria das telas do dashboard (`clientes`, `agenda`, `servicos`, `whatsapp`, `notificacoes`, `financeiro`, `fidelidade`, `estoque`, `marketing`, `lista-espera`, `automacao`, `perfil`) usa dados estáticos ou `setTimeout` simulando chamadas de API — não é só a aba "Configurações" que é fachada. Não existe nenhuma página pública de agendamento por salão nem cobertura de testes automatizados em todo o projeto, apesar de ambos serem requisitos explícitos do PRD/arquitetura.

---

## Crítico

- **[apps/api/src/modules/appointments/appointments.controller.ts:85,102,120,137,155,172 e appointments.service.ts (getById/update/confirm/cancel/complete/noShow)]** Nenhuma dessas rotas valida `businessId` do usuário autenticado contra o agendamento buscado — todas fazem `prisma.appointment.findUnique/update({ where: { id } })` puro. → Cenário: um usuário autenticado do Salão A descobre/adivinha o ID de um agendamento do Salão B e consegue visualizá-lo, alterá-lo, confirmá-lo, cancelá-lo (dispara mensagem WhatsApp real ao cliente do Salão B) ou marcá-lo como no-show. → Correção: toda leitura/escrita por `:id` deve incluir `businessId` no `where` (ex.: `findFirst({ where: { id, businessId } })`).
- **[apps/api/src/modules/services/services.controller.ts:62,79,97 e services.service.ts getById/update/delete]** Mesmo padrão: busca/edita/exclui serviço só por `id`, sem checar `businessId`. → Cenário: usuário de outro negócio altera preço/duração ou desativa um serviço de um concorrente.
- **[apps/api/src/modules/clients/clients.controller.ts:77,94,112 e clients.service.ts getById/update/delete]** Mesmo padrão para clientes (dados pessoais/telefone/observações). → Cenário: vazamento de PII de clientes de outro salão e possibilidade de editar/apagar cadastro alheio — viola LGPD (NFR4).
- **[apps/api/src/modules/business/business.controller.ts:102 (getById)]** `GET /api/business/:id` não confere que `:id` é o negócio do usuário logado; retorna profissionais (nome/telefone/comissão), serviços e contadores de qualquer negócio.
- **[apps/api/src/modules/business/business.controller.ts:192,210 (updateProfessional/removeProfessional)]** Atualizam/desativam o `User` só pelo `id`, sem checar `businessId`. Como `updateProfessional` permite trocar `phone`, um usuário do Salão A pode trocar o telefone de um profissional do Salão B para um número próprio e depois logar via OTP como esse usuário → **account takeover cross-tenant**.
- **[apps/api/src/modules/whatsapp/whatsapp.routes.ts:22,25,31 + whatsapp.controller.ts getStatus/getQRCode/disconnect/connectInstance/sendMessage]** `GET /status/:businessId`, `GET /qrcode/:businessId`, `POST /disconnect/:businessId` (só `authMiddleware`, sem checar dono) e `POST /connect`/`POST /send` (recebem `businessId` livre no body) não validam posse. → Cenário: usuário de qualquer salão obtém o QR Code de conexão de OUTRO salão (sequestro da sessão WhatsApp), desconecta a instância de um concorrente, ou envia mensagens usando o número de outro negócio.
- **[apps/api/src/modules/whatsapp/whatsapp.routes.ts:12-13 + whatsapp.controller.ts getSystemStatus/getSystemQRCode]** `GET /api/whatsapp/system/qrcode` e `/system/status` não têm **nenhuma** proteção (nem auth, nem a checagem de `x-api-key` que existe em `/system/setup`). → Qualquer pessoa na internet, sem login, pode obter o QR Code da instância de sistema usada para OTP de todos os usuários e sequestrar esse número.
- **[apps/api/src/modules/professional/index.ts (todas as rotas), loyalty/index.ts, inventory/index.ts]** Usam `(req as any).userId`/`(req as any).businessId`, mas `auth.middleware.ts` só popula `req.user.userId`/`req.user.businessId` (confirmado em `apps/api/src/types/express.d.ts`, que nem declara `req.userId`). Esses campos são sempre `undefined`. → Praticamente todo endpoint de `/api/professional/*`, `/api/loyalty/*` e `/api/inventory/*` roda com dados indefinidos — os módulos estão de fato quebrados em produção, não apenas "não implementados" como `situacao-projeto.md` sugere para os Epics 8.4/11/12.
- **[apps/api/src/modules/appointments/appointments.service.ts create(), ~linhas 33-65]** Busca `service` só por `id` (sem `businessId`) e nunca valida que `clientId`, `professionalId` e `serviceId` pertencem ao `businessId` informado. → Um usuário do Salão A pode criar agendamento referenciando entidades de outro negócio, corrompendo dados e disparando WhatsApp ao cliente errado.

## Alto

- **[apps/api/src/app.ts:38-50]** Rate limiting é um único limiter global (default 100 req/min por IP) aplicado a toda a API, incluindo `/api/auth/otp/request` e `/api/auth/login` — sem limite dedicado mais restrito para autenticação.
- **[apps/api/src/modules/professional/index.ts POST /goals/:userId e POST /badges/:userId]** Comentários dizem "owner only"/"system or owner", mas não há checagem de `req.user.role`. → Qualquer usuário autenticado pode definir metas/bônus ou conceder badges livremente.
- **[apps/api/src/modules/professional/index.ts, loyalty/index.ts, inventory/index.ts]** Nenhum uso de Zod, inconsistente com o resto da API (auth/business/services/clients/appointments/finance/marketing/waitlist/automation usam Zod).
- **[docker-compose.yml:11,56,60,96,98,99,101]** Segredos com fallback previsível: `POSTGRES_PASSWORD:-bela360_secret`, `JWT_SECRET:-super_secret_jwt_key_change_in_production`, `EVOLUTION_API_KEY:-bela360_evolution_key`. Risco se esse compose (dev) for usado sem `.env` configurado.
- **[apps/api/src/modules/appointments/appointments.service.ts — mensagens hardcoded]** Confirmação/cancelamento usam strings fixas; `MessageTemplate` (criado no onboarding em `business.service.ts`, tipos confirmation/reminder/cancellation) nunca é lido em lugar nenhum (`grep` confirma). → Story 3.1 AC4 ("Template configurável pelo profissional") não é cumprida na prática.
- **[apps/api/src/modules/finance/finance.service.ts registerPayment]** `discount` (`.min(0)`) não é validado contra `amount` (`.positive()`) — nada impede `discount > amount`, gerando `finalAmount`/`commissionAmount`/`businessAmount` negativos persistidos no caixa.

## Médio

- **[Frontend — páginas 100% mockadas, mesmo padrão da aba "Configurações" já identificada, porém muito mais amplo]**
  - `apps/web/src/app/(dashboard)/clientes/page.tsx:20-25` — array estático `initialClients`, zero `fetch`/`useEffect`.
  - `agenda/page.tsx:39` — array estático `initialAppointments`.
  - `servicos/page.tsx:21` — array estático `initialServices`.
  - `whatsapp/page.tsx:11,19` — `mockConversations`/`mockMessages`.
  - `notificacoes/page.tsx:26,83` — `mockRecentMessages`/`mockScheduledNotifications`.
  - `financeiro/page.tsx:57`, `fidelidade/page.tsx:61`, `estoque/page.tsx:105`, `marketing/page.tsx:76`, `lista-espera/page.tsx:50`, `automacao/page.tsx:29`, `perfil/page.tsx:66` — todos com `useEffect` contendo o comentário literal `// Simulated data - replace with API call`, vários com `await new Promise(resolve => setTimeout(resolve, 500))` só para fingir loading.
  - `profissional/(dashboard)/meu-painel/page.tsx:75` — mesmo padrão.
  - Confirmadas como **reais**: `dashboard/page.tsx` (usa `analyticsApi`), `analiticos/page.tsx`, aba "Marca" de `configuracoes/page.tsx`, e `profissional/(dashboard)/comissoes/page.tsx` (`fetch('/api/finance/my/commissions')`).
- **[Cobertura de testes — projeto inteiro]** Zero `*.test.ts`/`*.spec.ts`, apesar de `vitest` já instalado (`apps/api/package.json`) e o PRD exigir 70% de cobertura em lógica de negócio. Maior risco sem teste: `finance.service.ts` (comissão/caixa), `appointments.service.ts checkConflict` (overbooking), `auth.service.ts` (login/OTP), e os módulos quebrados citados acima (um teste de integração básico pegaria o bug de `req.userId` na hora).
- **[Gap de whitelabel — confirmado]** Nenhuma rota `/agendar/[slug]` existe em `apps/web/src/app`. Cliente final não tem nenhuma superfície com a marca do salão — único caminho é WhatsApp bot (texto puro) ou o dono agendando manualmente.
- **["bela360" hardcoded em pontos que deveriam refletir a marca do salão-cliente]** `auth.service.ts:80` (mensagem de OTP sempre "código de acesso bela360"); `components/ui/Logo.tsx:49` (texto fixo no dashboard de qualquer negócio, ignorando `business.settings.branding` já salvo pela aba "Marca"); `dashboard/page.tsx:283,360` ("Bem-vindo ao bela360" fixo); `app/layout.tsx:11,16,19` (metadata sempre "bela360").

## Baixo

- **[apps/api/src/app.ts:85-87]** `GET /api/health` retorna `database`/`redis: 'connected'` como strings fixas (`// TODO: Actually check`) — nunca checa de fato, mascarando indisponibilidade real (viola Story 1.6/NFR3).
- **[apps/api/src/modules/auth/auth.service.ts:26-27]** `generateOTP()` usa `Math.random()` em vez de `crypto.randomInt` — abaixo do padrão esperado para segredos de autenticação.
- **[apps/api/src/modules/auth/auth.service.ts requestOTP/verifyOTP]** OTP salvo redundantemente em Postgres e Redis com TTLs separados; `verifyOTP` aceita qualquer um — a confirmar se é fallback intencional ou duplicação acidental.
- **[apps/api/src/modules/whatsapp/whatsapp.controller.ts getSystemStatus, ~78-85]** Em erro, responde `200 OK` com `state: 'not_configured'`, mascarando falha real da Evolution API.
- **[Documentação desatualizada]** `situacao-projeto.md`/`promessa-vs-entrega.md` classificam Financeiro/Marketing como "schema apenas", mas o código está bem mais implementado (e mais bem escopado por tenant) que os módulos "core"; por outro lado Epics 8.4/11/12 estão codificados, porém quebrados pelo bug de `req.userId`. Documentos de status precisam de atualização antes de guiar planejamento.

## Arquitetura (observações transversais)

- **Causa raiz dos itens críticos de isolamento:** não existe helper central de "tenant ownership". Módulos mais novos (finance, marketing, waitlist, automation) escopam por `businessId` consistentemente; os módulos "core" (business, services, clients, appointments) e os quebrados (professional, loyalty, inventory) não. Recomenda-se um helper único (`findOwnedOrThrow`) e um teste de integração genérico que tente acessar recursos de outro tenant em cada rota autenticada.
- **Dependência forte do WhatsApp sem fallback real:** login primário (OTP) depende de `systemWhatsApp.sendText`; único fallback é login por senha, que só funciona se o usuário já tiver definido uma — não garantido para quem só passou pelo onboarding via WhatsApp.
- **Uso inconsistente de Zod** confirmado entre módulos, como detalhado acima.
