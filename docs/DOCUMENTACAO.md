# Documentação Geral — bela360

**Última atualização:** 2026-07-09
**Repositório:** https://github.com/andersondreger/bela360
**Domínio de produção:** https://bela360.wayia.com.br

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
                         ┌──────────▼───────────┐
                         │   Nginx (VPS, SSL)     │
                         └───┬───────────┬───────┘
                 /  (root)   │           │  /api, api.*
                 ┌───────────▼──┐   ┌────▼─────────┐
                 │  Web (Next.js)│   │ API (Express) │
                 │   porta 3000  │   │  porta 3001   │
                 └───────────────┘   └───┬───────┬───┘
                                          │       │
                                ┌─────────▼──┐ ┌──▼───────┐
                                │  Supabase   │ │  Redis    │
                                │ (Postgres)  │ │ (BullMQ)  │
                                └─────────────┘ └───────────┘
                                          │
                                ┌─────────▼──────────┐
                                │  Evolution API v2    │
                                │  (WhatsApp gateway)  │
                                └───────────────────────┘
```

- **Monorepo** gerenciado com `pnpm` workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Backend (`apps/api`)**: Node.js + Express + TypeScript. ORM Prisma sobre PostgreSQL (Supabase). Filas assíncronas com BullMQ + Redis (envio de mensagens, lembretes, automações). Autenticação via JWT + refresh token, login por OTP enviado no WhatsApp. Logs estruturados com Pino.
- **Frontend (`apps/web`)**: Next.js 14 (App Router) + React 18 + Tailwind CSS + TanStack Query + Recharts.
- **Integração WhatsApp**: [Evolution API v2](https://github.com/EvolutionAPI/evolution-api) — gateway open-source que conecta a um número de WhatsApp via QR Code e expõe API REST + webhooks. O bela360 usa a Evolution API para enviar mensagens (texto, botões, listas) e para receber respostas via webhook, processadas por um chatbot simples de detecção de intenção.
- **Banco de dados**: PostgreSQL gerenciado pelo **Supabase**, acessado via Prisma (`DATABASE_URL`). Não usa neste momento os SDKs de Auth/Storage do Supabase — apenas o Postgres.
- **Infraestrutura**: self-hosted em VPS via Docker Compose + Nginx + Let's Encrypt (certbot).

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
| Infra | Docker, Docker Compose, Nginx, Let's Encrypt |
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

Ambiente atual: **VPS própria** (Docker Compose) + **Supabase** (Postgres) + **Evolution API** (própria instância) + **Cloudflare** (DNS) + **Let's Encrypt** (SSL).

Domínios:
- `https://bela360.wayia.com.br` → frontend (Next.js)
- `https://api.bela360.wayia.com.br` → backend (Express)
- (opcional) `https://whatsapp.bela360.wayia.com.br` → painel da Evolution API, se auto-hospedada

Passo a passo detalhado (SSH, Docker, Nginx, SSL, migrações): ver [`docs/DEPLOY-VPS.md`](./DEPLOY-VPS.md).

Diferença em relação ao guia original: o serviço `postgres` do `docker-compose.prod.yml` é **substituído pelo Postgres do Supabase** — não sobe container de banco local em produção, apenas `DATABASE_URL` apontando para o Supabase.

Comandos usuais:

```bash
# subir/atualizar
cd ~/bela360
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# migrações (contra o Supabase)
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# logs
docker compose -f docker-compose.prod.yml logs -f api
```

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
- Rate limiting configurado no Express (`RATE_LIMIT_*`) e no Nginx para a rota da API.
- HTTPS obrigatório em produção via Let's Encrypt, renovação automática via cron/certbot.
- Dados de clientes (nome, telefone) são PII — tratar conforme LGPD (ver `docs/architecture.md`, seção de proteção de dados).
