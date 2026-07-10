# Documentação Geral — bela360

**Última atualização:** 2026-07-10
**Repositório:** https://github.com/andersondreger/bela360
**Domínio de produção:** https://bela360.wayia.com.br (no ar)

---

## 1. O que é o bela360

O **bela360** é uma plataforma SaaS de gestão e automação para negócios de beleza (salões, barbearias, clínicas de estética, SPAs, estúdios de manicure/depilação) com o **WhatsApp como canal principal de relacionamento com o cliente final**.

O sistema resolve três dores centrais desses negócios:

1. **Agenda manual e conflitos de horário** → agenda inteligente por profissional, com detecção de conflito e lista de espera.
2. **Falta de acompanhamento do cliente** → CRM com histórico, segmentação (VIP/Regular/Inativo/Novo) e preferências salvas.
3. **No-show e ociosidade da agenda** → automações via WhatsApp (confirmação, lembrete 24h, reativação de inativos, aniversário, pós-atendimento).

Módulos implementados no backend: autenticação (OTP via WhatsApp), negócios, serviços, clientes, agendamentos, WhatsApp/chatbot, analytics, financeiro (caixa, comissões), estoque, fidelidade (pontos/recompensas), lista de espera, marketing (sugestões e templates de conteúdo) e perfil/ranking de profissionais.

---

## 2. Arquitetura

```
                         ┌─────────────────────┐
                         │   Cloudflare DNS      │
                         │ bela360.wayia.com.br  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼────────────┐
                         │  Traefik (VPS, SSL)     │  ← compartilhado com outros
                         └───┬────────────┬───────┘     projetos na mesma VPS
              Host(dominio)  │            │  Host(dominio) && PathPrefix(/api)
                 ┌───────────▼──┐   ┌─────▼────────┐
                 │  Web (Next.js)│   │ API (Express) │
                 │   porta 3000  │   │  porta 3001   │
                 └───────────────┘   └───┬───────┬───┘
                                          │       │
                                ┌─────────▼──┐ ┌──▼───────┐
                                │  Postgres   │ │  Redis    │
                                │ (container) │ │ (BullMQ)  │
                                └─────────────┘ └───────────┘
                                          │
                                ┌─────────▼──────────┐
                                │  Evolution API v2    │
                                │ evo2.wayiaflow.com.br │
                                │ (instância externa,   │
                                │  fora deste compose)  │
                                └───────────────────────┘
```

- **Monorepo** gerenciado com `pnpm` workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Backend (`apps/api`)**: Node.js + Express + TypeScript. ORM Prisma sobre PostgreSQL. Filas assíncronas com BullMQ + Redis (envio de mensagens, lembretes, automações). Autenticação via JWT + refresh token, login por OTP enviado no WhatsApp. Logs estruturados com Pino.
- **Frontend (`apps/web`)**: Next.js 14 (App Router) + React 18 + Tailwind CSS + TanStack Query + Recharts.
- **Integração WhatsApp**: [Evolution API v2](https://github.com/EvolutionAPI/evolution-api) — instância própria já em produção em `https://evo2.wayiaflow.com.br` (fora do compose do bela360, compartilhada por outros projetos da mesma VPS). O bela360 se conecta a ela via `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`, cria sua própria instância (`bela360_system`) e configura o webhook automaticamente (`/api/whatsapp/webhook`) na primeira ativação. Importante: a Evolution API v2 espera os nomes de eventos de webhook em `UPPER_SNAKE_CASE` (`CONNECTION_UPDATE`, `MESSAGES_UPSERT`, `QRCODE_UPDATED` etc.) — ver `apps/api/src/modules/whatsapp/whatsapp.controller.ts`.
- **Banco de dados**: PostgreSQL. **Estado atual: container Postgres local** (serviço `postgres` do `docker-compose.prod.yml`), usado como fallback. A migração planejada para **Supabase** ficou temporariamente bloqueada (o pooler do Supabase ativou um circuit breaker de segurança após tentativas de conexão com senha incorreta) — trocar `DATABASE_URL` para a connection string do Supabase (pooler `aws-1-sa-east-1.pooler.supabase.com`, projeto `dteagxhnuhejefvguxfw`) assim que o bloqueio expirar é a próxima etapa pendente.
- **Infraestrutura**: VPS compartilhada com outros projetos (pet360, imob360 etc.), todos atrás de um **Traefik** único (container `traefik`, gerenciado via Portainer em `/root/Portainer/docker-compose.yml`) que cuida do roteamento por domínio e emissão automática de SSL (Let's Encrypt, resolver `leresolver`). O bela360 **não usa nginx nem certbot próprios** — apenas labels do Traefik no `docker-compose.prod.yml`. Para o Traefik enxergar os containers do bela360, a rede do projeto precisa estar conectada a ele: `docker network connect bela360_default traefik` (necessário uma vez, ou de novo se a rede for recriada).

---

## 3. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Backend | Node.js, Express 4, TypeScript, Zod (validação) |
| ORM / Banco | Prisma 5 + PostgreSQL (Supabase) |
| Filas / Cache | Redis + BullMQ |
| WhatsApp | Evolution API v2 |
| Autenticação | JWT (access + refresh) via OTP no WhatsApp |
| Infra | Docker, Docker Compose, Traefik (roteamento + SSL automático) |
| Gerenciador de pacotes | pnpm (workspaces) |

---

## 4. Estrutura do repositório

```
bela360/
├── apps/
│   ├── api/              # Backend Express + Prisma
│   │   ├── src/modules/  # auth, business, services, clients, appointments,
│   │   │                 # whatsapp, analytics, finance, inventory, loyalty,
│   │   │                 # waitlist, marketing, professional, automation
│   │   └── prisma/schema.prisma
│   └── web/               # Frontend Next.js
│       └── src/app/(dashboard)/{agenda,clientes,servicos,whatsapp,configuracoes}
├── packages/shared/        # Tipos e utilitários compartilhados
├── docker/                 # Dockerfiles (api, web) + nginx + postgres
├── docker-compose.yml       # Ambiente de desenvolvimento
├── docker-compose.prod.yml  # Ambiente de produção
└── docs/                   # Documentação (este diretório)
```

---

## 5. Rodando localmente

Pré-requisitos: Node.js ≥ 20, pnpm ≥ 8, Docker.

```bash
git clone https://github.com/andersondreger/bela360.git
cd bela360
pnpm install

cp .env.example .env
# edite .env com as credenciais (ver seção 6)

# banco (local) e redis
docker compose up -d postgres redis

pnpm db:migrate      # prisma migrate dev
pnpm dev             # sobe api (3001) e web (3000) em paralelo
```

Para desenvolvimento local sem Supabase, o `docker-compose.yml` sobe um Postgres próprio — basta usar o `DATABASE_URL` padrão do `.env.example`. Em produção, o Postgres local é substituído pelo Supabase (ver seção 7).

---

## 6. Variáveis de ambiente

Arquivo base: `.env.example`. As principais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Postgres. Em produção, aponta para o Supabase. |
| `REDIS_URL` | Connection string do Redis (fila BullMQ). |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Chaves para assinar tokens. Gerar com `openssl rand -base64 32`. |
| `EVOLUTION_API_URL` | URL da instância Evolution API (interna ou pública). |
| `EVOLUTION_API_KEY` | API Key global da Evolution API. |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp usada pelo bela360. |
| `API_URL` / `FRONTEND_URL` | URLs públicas usadas para CORS, webhooks e links. |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` | URLs consumidas pelo frontend (client-side). |

**Nunca commitar o arquivo `.env`** — ele já está no `.gitignore`.

---

## 7. Deploy em produção

Ambiente atual: **VPS compartilhada** (Docker Compose + Traefik) + **Postgres em container** (fallback, Supabase pendente) + **Evolution API externa** (`evo2.wayiaflow.com.br`) + **Cloudflare** (DNS).

> **Nota:** o guia [`docs/DEPLOY-VPS.md`](./DEPLOY-VPS.md) descreve um setup com nginx próprio + certbot manual — **está desatualizado**. O deploy real usa o Traefik já existente na VPS (ver seção 2). Mantido apenas como referência histórica.

Domínio único: `https://bela360.wayia.com.br` — frontend na raiz, API em `/api/*` (roteado pelo Traefik via `PathPrefix`, sem necessidade de subdomínio `api.*`).

Passo a passo real usado:

```bash
cd /root/projetos/bela360

# 1. .env de produção (não versionado) com DATABASE_URL, JWT_*, EVOLUTION_*, API_URL, FRONTEND_URL
#    (ver seção 6)

# 2. build + subir os containers do projeto
docker compose -f docker-compose.prod.yml up -d --build

# 3. conectar a rede do projeto ao Traefik compartilhado (só necessário na 1a vez
#    ou se a rede "bela360_default" for recriada)
docker network connect bela360_default traefik

# 4. migrações do Prisma (rodar de dentro de apps/api, onde está o schema)
docker compose -f docker-compose.prod.yml exec api sh -c "cd apps/api && node_modules/.bin/prisma migrate deploy"

# 5. logs
docker compose -f docker-compose.prod.yml logs -f api
```

**Pegadinhas já resolvidas (documentadas para não se repetir):**
- `npx prisma` dentro do container busca uma versão nova do npm em vez de usar a já instalada — use o binário local (`apps/api/node_modules/.bin/prisma`) a partir de `apps/api`, onde fica `prisma/schema.prisma`.
- Os `HEALTHCHECK` dos Dockerfiles usavam `wget http://localhost:PORT`, que resolve para `::1` (IPv6) e falha em containers sem IPv6 interno — o container fica marcado **unhealthy** mesmo funcionando normalmente, e **o Traefik ignora containers unhealthy no roteamento** (a rota some silenciosamente, sem erro óbvio). Corrigido para `127.0.0.1` em `docker/api/Dockerfile` e `docker/web/Dockerfile`.
- A Evolution API v2 exige os nomes de eventos de webhook em `UPPER_SNAKE_CASE`; o código antigo enviava em `lower.case`, causando erro 400 ao configurar o webhook (não impedia a criação da instância/QR Code, só a configuração do webhook). Corrigido em `whatsapp.controller.ts`.
- Containers sem `traefik.enable: "false"` explícito ficam auto-expostos pelo provider Docker do Traefik (ex.: `postgres`/`redis` ganhavam um router `Host(nome-do-container)`) — inofensivo aqui, mas foi desabilitado por higiene.

---

## 8. Estado atual do projeto

Baseado no histórico de desenvolvimento (ver `docs/STATUS.md` para o detalhamento por módulo):

- Backend: Epics 1–13 do PRD implementados (auth, negócios, serviços, clientes, agendamentos, WhatsApp/chatbot, analytics, financeiro, comissões, estoque, fidelidade, marketing, perfil de profissional).
- Frontend: todas as telas principais implementadas (dashboard, agenda, clientes, serviços, WhatsApp, configurações), com gráficos reais (Recharts).
- Banco: schema Prisma com 30+ tabelas cobrindo todos os módulos.
- Pendências conhecidas (ver `docs/backlog.md` e `docs/STATUS.md`): testes automatizados, CI/CD, monitoramento (Sentry), paginação e validação de formulário em algumas telas.

Documentos complementares já existentes no projeto:
- `docs/prd.md` — requisitos de produto
- `docs/architecture.md` — arquitetura detalhada original
- `docs/brief.md` — briefing inicial do produto
- `docs/backlog.md`, `docs/roadmap-fases.md` — backlog e fases
- `docs/analise-estrategica-bela360.md` — análise estratégica de mercado
- `docs/ESTRATEGIA-MARKETING.md` — **estratégia de marketing** (ver documento dedicado)

---

## 9. Segurança e boas práticas

- Segredos (JWT, API keys, `DATABASE_URL`) só existem no `.env` do servidor — nunca no repositório.
- Rate limiting configurado no próprio Express (`RATE_LIMIT_*`).
- HTTPS obrigatório em produção via Let's Encrypt, emitido e renovado automaticamente pelo Traefik compartilhado (sem cron/certbot manual).
- Dados de clientes (nome, telefone) são PII — tratar conforme LGPD (ver `docs/architecture.md`, seção de proteção de dados).
- A VPS é compartilhada com outros projetos (pet360, imob360, n8n, typebot etc.) — evitar comandos destrutivos amplos (`docker system prune`, `docker network rm` em redes que não são do bela360) sem checar o que mais está rodando (`docker ps`).
