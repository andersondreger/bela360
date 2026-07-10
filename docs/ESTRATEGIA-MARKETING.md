# Estratégia de Marketing — bela360

**Última atualização:** 2026-07-09
**Complementa:** [`docs/analise-estrategica-bela360.md`](./analise-estrategica-bela360.md) (mercado, TAM/SAM/SOM, ICP, pricing, SWOT)

Este documento é o **playbook tático de marketing**: como adquirir, converter e reter clientes na prática, canal a canal. Para números de mercado, personas completas e modelo de monetização, ver o documento de análise estratégica — aqui não se repete o que já está lá.

---

## 1. Posicionamento e mensagem central

**Posicionamento:** o bela360 não é "mais um sistema de agenda" — é o **WhatsApp do seu salão trabalhando sozinho**: confirma horário, lembra o cliente, chama quem sumiu e avisa aniversário, sem o dono precisar digitar nada.

**Mensagem central (elevator pitch):**
> "Pare de perder dinheiro com falta. O bela360 confirma, lembra e traz o cliente de volta pelo WhatsApp — automático."

**Pilares de mensagem** (usar em todos os canais):
1. **Redução de no-show** — dor #1 do ICP (87% citam faltas como problema, ver análise estratégica).
2. **Zero fricção** — o dono já usa WhatsApp o dia todo; o produto vive dentro do hábito existente, não exige app novo para o cliente final.
3. **Prova em números** — sempre que possível, comunicar com dado concreto ("reduz faltas em até 60%", "recupera X% de clientes inativos"), não com adjetivo vago.

**O que evitar:** jargão de "SaaS"/"plataforma de gestão" na comunicação de topo de funil — o ICP (dono de salão de bairro, baixa literacia digital) reage melhor a linguagem de resultado ("mais cliente voltando", "menos furo na agenda") do que a linguagem de produto.

---

## 2. O growth loop nativo do produto (maior alavanca disponível)

Isso é o que torna o bela360 estruturalmente diferente de concorrentes (Trinks, Booksy etc.) do ponto de vista de marketing: **o próprio produto é um canal de aquisição**, porque toda automação passa pelo WhatsApp do cliente final.

```
Salão A usa bela360
   → Envia confirmação/lembrete via WhatsApp para clientes finais
      → Cliente final vê a mensagem bem formatada, profissional, com marca "via bela360"
         → Uma fração desses clientes finais também é dona de salão/barbearia/clínica
            → Pergunta "que sistema é esse?" → cadastro
```

**Como maximizar esse loop (ações concretas):**
- Incluir, de forma discreta e não intrusiva, uma assinatura/rodapé nas mensagens automáticas no plano gratuito/essencial (ex.: *"Agendamento automático via bela360"* com link curto). Remover a marca é um incentivo de upgrade para o plano pago (branding removal como feature paga — comum em produtos freemium: Calendly, Typeform).
- Botão de "responder" nas mensagens de confirmação pode incluir um CTA leve tipo *"Tem um salão? Teste grátis: bela360.wayia.com.br"* apenas em campanhas pontuais (não em toda mensagem, para não incomodar o cliente final do salão).
- Cada novo agendamento confirmado é, na prática, uma impressão de marca gratuita — o CAC marginal desse canal é ~zero. Priorizar isso antes de qualquer canal pago.

---

## 3. Canais de aquisição — tático por canal

### 3.1 Comunidade e indicação (canal #1 para o ICP)
Donos de salão de bairro confiam muito mais em indicação de colega do que em anúncio. É o canal de menor CAC e maior LTV do setor.

- **Programa de indicação**: cliente atual indica → 1 mês grátis para quem indica e para quem entra (dois lados ganham, reduz fricção da indicação).
- **Grupos de WhatsApp/Facebook de cabeleireiros, barbeiros e esteticistas** (existem centenas ativos por região) — presença orgânica respondendo dúvidas sobre agenda/no-show, não fazendo spam de venda direta.
- **Associações e Sebrae**: parcerias para workshops "Como digitalizar seu salão" — Sebrae já tem programas de capacitação para o setor; bela360 entra como case/ferramenta recomendada.

### 3.2 Parcerias de canal (distribuição indireta)
- **Distribuidoras de produtos de beleza** (ex: representantes que já visitam salões fisicamente todo mês) — parceria de indicação com comissão recorrente. Alcança o ICP no ponto de contato que ele já confia, sem CAC de mídia.
- **Escolas de cabeleireiro/estética e cursos profissionalizantes** — parceria para apresentar o bela360 na formatura/certificação como "o sistema que profissionais usam", capturando o cliente antes de ele decidir qual ferramenta usar ao abrir o próprio negócio.
- **Fabricantes de equipamento/mobiliário para salão** — co-marketing em feiras do setor (ex: Hair Brasil, Cosmoprof, Beauty Fair).

### 3.3 Redes sociais (Instagram e TikTok — orgânico primeiro)
O ICP secundário (autônomos, profissionais mais jovens) consome muito conteúdo de Instagram/TikTok voltado para o setor de beleza.

- **Formato que funciona no setor**: antes/depois de agenda (print de agenda cheia de furo → agenda organizada), depoimento em vídeo curto do dono do salão, "um dia na vida" de quem automatizou o WhatsApp.
- **Conteúdo educativo recorrente**: "3 mensagens que todo salão deveria mandar no WhatsApp", "como cobrar sinal sem parecer chato", "o que fazer com cliente que some".
- Nano/micro-influenciadores do setor de beleza (5k–50k seguidores, cabeleireiros/barbeiros com autoridade local) — parceria de troca ou comissão, mais eficiente que anúncio pago em fase inicial.

### 3.4 Busca local (Google Meu Negócio + SEO local)
- Dono de salão pesquisa termos de dor, não de produto: *"como evitar falta de cliente no salão"*, *"mensagem de confirmação de horário whatsapp"*, *"sistema de agendamento para salão de beleza"*.
- Conteúdo de blog otimizado para essas buscas, cada artigo terminando em CTA de teste grátis.
- Google Meu Negócio otimizado para buscas tipo "sistema para salão perto de mim" caso haja estratégia de vendas presencial/regional.

### 3.5 Outbound via WhatsApp (usar o próprio produto para vender)
- Faz sentido comercial e de marca: prospectar donos de salão **pelo WhatsApp**, com mensagens que já demonstram o padrão de qualidade do produto (mesma UX que o cliente final do salão vai receber).
- Segmentar por região via Google Maps/Instagram (perfis públicos de salões), abordagem consultiva ("vi que vocês têm X avaliações no Google, quantos desses clientes voltam no mês seguinte?").
- Importante: seguir política de opt-in do WhatsApp Business/Evolution API para não gerar bloqueio de número — outbound frio deve ser feito com moderação e não pela mesma instância usada para os clientes em produção.

### 3.6 Eventos e feiras do setor
- Feiras de beleza (Hair Brasil, Cosmoprof, Beauty Fair, feiras regionais do Sebrae) são onde o ICP se reúne fisicamente e onde a confiança é maior. Estande simples com demo ao vivo do WhatsApp automatizado converte bem porque é tangível na hora.

---

## 4. Funil e ativação

```
Visitante → Cadastro (trial grátis) → Ativação → Cliente pagante → Expansão/Indicação
```

**Ponto crítico de ativação**: o valor só é percebido quando o dono conecta o WhatsApp (QR Code) e o sistema envia a **primeira confirmação automática de verdade**. Até esse momento, é só um cadastro. Prioridades de produto/onboarding para marketing funcionar:

1. Onboarding deve levar o usuário a conectar o WhatsApp e criar o primeiro agendamento **no primeiro acesso** (checklist guiado, não tela vazia).
2. Ativação = "primeira mensagem automática enviada com sucesso" — é o evento a ser tratado como North Star de ativação, e todo material de marketing/onboarding deve empurrar para esse ponto o mais rápido possível.
3. Sem ativação em até 48h, disparar um follow-up humano (WhatsApp do time comercial) — recuperação de trial é mais barata que aquisição nova.

**Modelo de monetização e planos**: já definidos em `docs/analise-estrategica-bela360.md` (seção 4) — Gratuito / Essencial R$49 / Profissional R$99 / Business R$199. O plano gratuito é a isca do growth loop da seção 2 (mensagens com marca bela360); a remoção da marca é um dos gatilhos de upgrade.

---

## 5. Calendário de conteúdo (modelo mensal recorrente)

| Semana | Instagram/TikTok | WhatsApp/Comunidade | Blog/SEO |
|---|---|---|---|
| 1 | Depoimento em vídeo de cliente real | Post em 2-3 grupos com dica prática (não venda) | Artigo sobre redução de no-show |
| 2 | Reels "antes/depois" de agenda | Resposta ativa em dúvidas de grupos do setor | Artigo sobre fidelização de clientes |
| 3 | Conteúdo educativo (dica de mensagem/copy) | Case de indicação (cliente que trouxe outro cliente) | Artigo comparando manual vs automático |
| 4 | Bastidores/produto (nova automação lançada) | Oferta de indicação (1 mês grátis) | Atualização de página de planos/CTA |

---

## 6. Orçamento por fase

| Fase | Foco de investimento | Canais priorizados |
|---|---|---|
| **Bootstrap (0–3 meses)** | Tempo do time, não mídia paga | Growth loop do produto, grupos/comunidades, indicação, outbound WhatsApp |
| **Tração inicial (3–6 meses)** | Micro-influenciadores + conteúdo | Instagram/TikTok, parcerias com distribuidoras, SEO local |
| **Escala (6–12 meses)** | Mídia paga segmentada (Meta Ads geolocalizado por bairro/cidade) + feiras | Paid social, eventos do setor, Google Ads para termos de dor |

Regra prática: **não investir em mídia paga antes de validar a ativação (seção 4)** — trazer tráfego pago para um funil que não ativa bem é o erro mais comum e mais caro em marketing de SaaS.

---

## 7. Métricas de marketing a acompanhar

Complementa os KPIs de negócio já listados em `docs/analise-estrategica-bela360.md` (seção 7):

| Métrica | O que indica |
|---|---|
| CAC por canal | Qual canal realmente vale escalar |
| % de trials que ativam em 48h | Saúde do onboarding, não só do marketing |
| % de novos clientes vindos de indicação | Saúde do growth loop (meta: crescer essa fatia com o tempo, reduzindo dependência de canais pagos) |
| Taxa de resposta em outbound WhatsApp | Qualidade da segmentação/abordagem |
| Custo por lead em parcerias vs. mídia paga | Priorização de orçamento entre fases |

---

## 8. Plano de execução — primeiros 90 dias

**Dias 1–30 — Fundação**
- Ativar rodapé de marca nas mensagens automáticas do plano gratuito (growth loop).
- Montar lista de 20-30 grupos de WhatsApp/Facebook do setor por região prioritária e iniciar presença orgânica.
- Publicar 2 artigos de blog otimizados para termos de dor (no-show, confirmação automática).
- Programa de indicação (1 mês grátis para os dois lados) ativo e divulgado para a base atual.

**Dias 31–60 — Primeiros canais pagos/parceria**
- Fechar 2-3 parcerias com distribuidoras/representantes locais.
- Iniciar outbound consultivo via WhatsApp para lista segmentada (Google Maps/Instagram) na região prioritária.
- Testar 3-5 micro-influenciadores do setor (troca ou comissão) para primeiras peças de vídeo.

**Dias 61–90 — Medir e escalar o que funciona**
- Consolidar CAC por canal (seção 7) e realocar orçamento para os 1-2 canais com melhor CAC/ativação.
- Primeira participação em evento/feira regional do setor, se orçamento permitir.
- Revisar mensagens/posicionamento com base no que gerou mais resposta nos 60 dias anteriores.
