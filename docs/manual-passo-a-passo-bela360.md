# Manual: passo a passo completo do bela360

Escrito em 2026-08-16 a pedido do Anderson, adaptando pra dentro do próprio
repo `bela360` o manual que já existia em `waymeet/docs/manual-onboarding-bela360.md`
(esse outro cobre o cruzamento bela360 → WayMeet; este aqui cobre **só o
bela360**, do zero: desde acessar a página principal até a gestão do
cliente no dia a dia). Todo campo, aba e comportamento abaixo foi conferido
direto no código nesta data — onde algo não funciona de verdade, está
marcado como **BUG conhecido**, não escondido.

Contexto que motivou este documento: o Anderson configurou um número de
WhatsApp **exclusivo pra este projeto** (a instância institucional que manda
código de acesso e boas-vindas pra clientes novos — conectada em produção
desde 2026-08-18, número 45991115540). O Passo 5 documenta exatamente como
foi conectado e como reconectar se cair de novo.

## Visão geral

O bela360 é o produto que o dono do salão usa no dia a dia — landing page
pública, cadastro (onboarding), login, e um painel com agenda, clientes,
serviços, estoque, financeiro, marketing e WhatsApp de atendimento. É
diferente do WayMeet (`waymeet.wayia.com.br` / `ceo.wayia.com.br`), que é a
camada de comando por cima (campanhas, IA generativa, disparo em massa) —
esse fluxo cruzado está no outro manual, não repetido aqui.

Duas instâncias de WhatsApp diferentes entram em jogo dentro do próprio
bela360, não confundir uma com a outra:

| Instância | Nome no evo2 | Serve pra | Onde se conecta |
|---|---|---|---|
| **Sistema (institucional)** | `bela360` (número 45991115540, ver Passo 5) | Enviar o código de acesso (OTP) e a mensagem de boas-vindas pra **todo cliente novo** que se cadastra, de qualquer salão | Só via API (Passo 5) — não tem tela no painel |
| **Atendimento do salão** | `bela360_<slug-do-salão>` | Agendamento, lembretes e lista de espera de **um salão específico** com clientes dele | `/configuracoes` → aba WhatsApp (Passo 4.6), uma por salão |

---

## Passo 0 — Acesso à página principal

URL: `https://bela360.wayia.com.br/` (`apps/web/src/app/page.tsx`)

Landing page pública, sem login. Traz:
- Hero com CTA pra cadastro/login.
- Seção "Capacidades" com 6 blocos: agendamento pelo WhatsApp, agenda
  inteligente, clientes e histórico, financeiro e comissões, relatórios em
  tempo real, lembretes automáticos.
- Dois links de entrada: **"Cadastre seu salão"** → `/onboarding` e
  **"Entrar"** → `/login`.

## Passo 1 — Cadastro do salão (`/onboarding`)

Formulário em 2 telas (`apps/web/src/app/onboarding/page.tsx`), com barra de
progresso (Seu salão → Você → Pronto):

**Tela 1 — Dados do salão**
| Campo | Obrigatório | Observação |
|---|---|---|
| Nome do salão | Sim (mín. 2 caracteres) | Ex: "Salão Bela Vita" |
| Tipo de negócio | Sim | Salão de beleza / Barbearia / Clínica de estética / Spa / Outro |
| Telefone do salão | Sim (mín. 10 dígitos) | Vira o login padrão |
| Cidade / UF | Não | |

**Tela 2 — Dados do responsável**
| Campo | Obrigatório | Observação |
|---|---|---|
| Seu nome | Sim (mín. 2 caracteres) | |
| Seu e-mail | Não | Só um dado de contato, não é usado pra login |
| Uso o mesmo telefone do salão pra entrar | — | Checkbox, marcado por padrão |
| Seu telefone (login) | Só se desmarcar o checkbox acima | |

Ao enviar (`POST /public/business/onboarding`), a conta é criada e aparece a
tela "Salão cadastrado!" dizendo que o código de acesso já foi gerado para o
telefone informado. O OTP sai primeiro pelo WhatsApp institucional (`bela360`,
ver Passo 5); se esse envio falhar, o backend cai pro Telegram — a tela
também já tenta gerar na hora um link de vínculo do Telegram
(`POST /auth/telegram/link`) e mostra um botão **"Abrir o Telegram e receber
o código"** como caminho alternativo. Se o link do Telegram falhar por
qualquer motivo, tem um link secundário "Já recebi o código, ir para o
login".

## Passo 2 — Login (`/login`)

Um único formulário (`OtpLoginForm`), sem abas visíveis por padrão — o modo
OTP é o inicial de propósito, porque toda conta nova nasce sem senha (aba de
senha começando como padrão gerava "inválido" sem o usuário entender por
quê — decisão registrada no próprio código).

**Fluxo padrão (OTP por WhatsApp/Telegram):**
1. Digita o telefone → "Enviar código" (`POST /auth/otp/request`).
2. Tela seguinte pede o código de 6 dígitos (`POST /auth/otp/verify`).
3. Se o WhatsApp não chegar, o link **"Não chegou o WhatsApp? Receber o
   código pelo Telegram"** aparece nessa mesma tela e gera um `t.me/...`
   pra abrir o bot e receber o próximo OTP por lá também.
4. Botão "Usar outro número" volta pro passo do telefone.

**Fluxo alternativo (senha):** link "Entrar com senha" no rodapé do passo do
telefone — só serve pra quem já teve uma senha definida manualmente (ex.
direto no banco), porque `/onboarding` nunca coleta senha.

Login de profissional é separado: link "É um profissional? Entrar como
profissional" leva a `/profissional`.

## Passo 3 — O painel (depois de logado)

Layout fixo em `apps/web/src/app/(dashboard)/layout.tsx`: sidebar à esquerda
com a marca do salão (logo/cor customizados se configurados no Passo 4.2,
senão o logo padrão do bela360) e a navegação:

Dashboard · Agenda · Clientes · Serviços · Lista de Espera · Fidelidade ·
Estoque · Financeiro · Marketing · Automação · WhatsApp · Analíticos · Meu
Perfil · Configurações.

Se o usuário logado for super admin da plataforma, aparece também um link
"Admin da plataforma" (`/admin`), separado do resto do menu.

## Passo 4 — Configurações (`/configuracoes`)

6 abas. Estado real de cada uma, conferido no código:

**4.1 — Negócio** ✅ funciona de verdade (`PUT` via `businessApi.updateInfo`)
| Campo | Editável |
|---|---|
| Nome do estabelecimento | Sim |
| Telefone | **Não** — é o login da conta, só leitura |
| Email | Sim |
| Endereço, Cidade, Estado, CEP | Sim |

**4.2 — Marca** ✅ funciona de verdade (`businessApi.updateBranding`)
Nome de exibição, upload de logo (JPG/PNG/WEBP, redimensionado
automaticamente) e cor principal — sobrescreve o logo/cor padrão do bela360
em toda a sidebar e header do painel.

**4.3 — Plano** ✅ funciona de verdade (cupom via `platformApi.redeemCoupon`)
O básico já cobre agenda, clientes, serviços e WhatsApp de atendimento.
Quatro módulos ficam bloqueados até um cupom liberar: **Marketing,
Automação, Fidelidade, Estoque**. Campo de código de cupom + botão
"Resgatar cupom"; cada módulo mostra badge "Liberado" (com validade) ou
"Bloqueado". Cupom é gerado só por admin da plataforma, não pelo próprio
dono do salão.

**4.4 — Horários** ⚠️ **BUG conhecido — não salva nada.** A tela lista os 7
dias da semana com checkbox + horário de abre/fecha, mas o botão "Salvar
horários" não tem nenhuma ação associada (sem `onClick`, sem chamada de
API) — é só UI estática por enquanto. Não usar pra prometer horário
funcionando pro cliente ainda.

**4.5 — Profissionais** ✅ funciona de verdade
Lista com nome, função (Profissional/Administrador/Recepcionista —
Proprietário não pode ser removido nem rebaixado por aqui), cor na agenda e
comissão (%). Cadastro/edição pede nome, telefone (usado pra esse
profissional receber o próprio código de acesso, por WhatsApp ou Telegram),
email opcional, função, cor e comissão.

**4.6 — WhatsApp (atendimento do salão)** ✅ funciona de verdade
Mostra status conectado/desconectado e abre o `WhatsAppConfigModal`
(QR Code via Evolution API). Essa é a instância `bela360_<slug>`, separada
da institucional do Passo 5. Depois de conectada, agendamentos, lembretes e
lista de espera passam a sair automaticamente por esse número; conversas e
envio manual ficam na aba **WhatsApp** do menu principal (Passo 7).

Depois disso, ainda vale configurar `/servicos` (o que o salão oferece) e
`/estoque` (se o módulo Estoque já estiver liberado no Passo 4.3).

## Passo 5 — Conectar o WhatsApp institucional (`bela360`)

Este é o número que o Anderson dedicou só pra este projeto: **45991115540**,
instância `bela360` no evo2 (nome vem de `EVOLUTION_INSTANCE_NAME` no
`.env`, é o mesmo valor usado pelo `SYSTEM_INSTANCE_NAME` no código — trocar
um sem trocar o outro faz o setup criar uma instância nova e o webhook parar
de bater). Esse número também é usado como cliente real de teste (ver
Passo 6) pra validar o fluxo OTP ponta a ponta. Ele **não tem tela no
painel** — é set-up único via API, protegido por API key (não por login de
usuário).

**Antes de rodar os comandos**: a chave não é uma senha à parte, é o mesmo
valor de `EVOLUTION_API_KEY` já configurado no `.env` do backend (raiz do
repo, na VPS de produção — `.env` é local, não fica no git). Copiar os
comandos abaixo sem exportar essa variável primeiro dá `"API key invalida"`
(testado ao vivo contra produção nesta correção — o endpoint funciona, só
faltava deixar isso explícito). No servidor, dentro da pasta do projeto:

```bash
# 0. Carregar a chave do .env pra variável do shell (uma vez por sessão de terminal)
export EVOLUTION_API_KEY=$(grep -m1 '^EVOLUTION_API_KEY=' .env | cut -d= -f2-)

# 1. Gerar o QR Code (cria a instância no evo2 se ainda não existir)
curl -X POST "https://bela360.wayia.com.br/api/whatsapp/system/setup" \
  -H "x-api-key: $EVOLUTION_API_KEY"
# resposta: { data: { instanceName: "bela360", qrcode, status: "awaiting_scan" } }

# 2. Escanear o QR retornado (campo qrcode, base64) com o WhatsApp escolhido,
#    igual ao fluxo normal do WhatsApp Web — precisa ser escaneado rápido,
#    o QR expira.

# 3. Conferir se conectou
curl "https://bela360.wayia.com.br/api/whatsapp/system/status?apiKey=$EVOLUTION_API_KEY"
# connected: true quando o pareamento completar
```

Sem essa variável (ou com o valor errado), os 3 endpoints
(`/whatsapp/system/setup`, `/system/status`, `/system/qrcode`) retornam 401
com `"API key invalida"` — o comando 0 acima é o que resolve isso.

Assim que essa instância ficar `connected`, todo cadastro novo (Passo 1)
passa a receber o OTP e a mensagem de boas-vindas direto no WhatsApp — e o
mesmo vale pro OTP de login (Passo 2) e pro convite de profissionais novos
(Passo 4.5). O código (`AuthService.notifyUser`, `apps/api/src/modules/auth/auth.service.ts`)
tenta o WhatsApp institucional primeiro; só cai pro Telegram (se o usuário
já tiver vinculado um chat) quando o envio falhar — então o Telegram nunca
mais é o único canal enquanto `bela360` estiver conectado, mas continua
funcionando como fallback se o número cair.

**Cuidado ao escolher o número**: se o número já estiver vinculado a outras
instâncias no mesmo servidor Evolution, o pareamento pode travar em
`connecting` sem completar (foi o que aconteceu nas duas primeiras
tentativas, documentado no manual do WayMeet) — prefira um número limpo,
nunca usado em outra instância do evo2.

## Passo 6 — Gestão de clientes (`/clientes`)

Tela principal do dia a dia do salão (`apps/web/src/app/(dashboard)/clientes/page.tsx`).

**Lista**: busca por nome, telefone ou email (debounce de 300ms) e tabela
com Cliente, Telefone, Cliente Desde, Total Visitas, Total Gasto e ação "Ver
perfil". Botão de exportar (`ExportButton`) gera a lista em arquivo com
nome, telefone, email, última visita, total de agendamentos e total gasto.

**Novo Cliente** (modal "Novo Cliente"):
| Campo | Obrigatório |
|---|---|
| Nome completo | Sim |
| Telefone | Sim |
| Email | Não |
| Data de nascimento | Não |
| Observações | Não |

**Perfil do cliente** (modal ao clicar "Ver perfil"): avatar com iniciais,
telefone, cards de Visitas e Total Gasto, e linha a linha de Email, Cliente
Desde, Aniversário e Observações (se preenchida). Dois atalhos de ação:
- **WhatsApp** → abre `wa.me/55<telefone>` numa nova aba (conversa direta,
  fora do sistema — não é o mesmo canal da aba WhatsApp do painel).
- **Agendar** → leva pra `/agenda`.

## Passo 7 — Resto do painel (visão rápida)

- **Agenda** (`/agenda`) — visão por dia/semana/mês, bloqueio automático de
  conflito, cores por profissional.
- **Serviços** (`/servicos`) — catálogo do que o salão oferece.
- **Lista de Espera** (`/lista-espera`) — clientes aguardando horário, com
  automação de aviso no dia (feature recente, ver commit `feat: editor de
  anuncios, lista de espera com horario e automacao no dia`).
- **Fidelidade**, **Estoque**, **Marketing**, **Automação** — atrás do plano
  premium (Passo 4.3); ficam visíveis mas bloqueados até um cupom liberar.
- **Financeiro** (`/financeiro`) — caixa, pagamentos, comissão por
  profissional.
- **WhatsApp** (`/whatsapp`) — inbox de conversas do WhatsApp de atendimento
  do salão (instância do Passo 4.6): lista de conversas com busca, badge de
  conectado/desconectado, chat com envio manual de mensagem.
- **Analíticos** (`/analiticos`) — relatórios de receita, serviços mais
  vendidos e desempenho da equipe.
- **Meu Perfil** (`/perfil`) — dados da própria conta logada.

## Checklist resumido

- [x] `bela360` (instância institucional) conectado (Passo 5, 45991115540) — pré-requisito pro OTP/boas-vindas sair por WhatsApp em vez de só Telegram
- [ ] Cliente (dono do salão) preenche `/onboarding` (Passo 1)
- [ ] Login testado — OTP chegando por WhatsApp ou Telegram (Passo 2)
- [ ] Aba Negócio e Marca configuradas (Passo 4.1–4.2)
- [ ] WhatsApp de atendimento do salão conectado (Passo 4.6, instância `bela360_<slug>`, separada da do Passo 5)
- [ ] Profissionais cadastrados (Passo 4.5)
- [ ] Serviços cadastrados (`/servicos`)
- [ ] Se o cliente pagar por módulo premium: cupom resgatado em Plano (Passo 4.3)
- [ ] Primeiros clientes cadastrados em `/clientes` (Passo 6)

## Bugs conhecidos registrados aqui

- **Aba Horários (`/configuracoes`) não salva nada** — botão sem ação, só
  UI estática (Passo 4.4).
- **`bela360` (WhatsApp institucional, número 45991115540)** — instância
  criada em produção em 2026-08-17, aguardando o QR ser escaneado. Até isso
  acontecer, `notifyUser` tenta o envio, falha, e cai pro fallback do
  Telegram automaticamente (comportamento esperado, não é bug).

## Ver também

- `waymeet/docs/manual-onboarding-bela360.md` — o mesmo fluxo visto do lado
  do WayMeet: como cadastrar essa mesma empresa lá depois (marketing com
  IA, campanhas, disparo de WhatsApp em massa via evo2).
- `docs/STATUS.md`, `docs/situacao-projeto.md` — snapshots de infra/deploy
  mais antigos, não conferidos nesta rodada (podem estar desatualizados
  quanto a domínio/estrutura).
