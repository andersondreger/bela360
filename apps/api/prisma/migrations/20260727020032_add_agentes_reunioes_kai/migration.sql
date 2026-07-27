-- CreateEnum
CREATE TYPE "AgentePapel" AS ENUM ('DIRETOR', 'GESTAO_CORPORATIVA', 'FINANCEIRO', 'MARKETING', 'ATENDIMENTO', 'TI');

-- CreateEnum
CREATE TYPE "ReuniaoStatus" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "IntegracaoStatus" AS ENUM ('PLANEJADA', 'EM_TESTE', 'PRONTA_PRODUCAO');

-- CreateEnum
CREATE TYPE "AprovacaoKaiStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "AmbientePropagacao" AS ENUM ('SANDBOX', 'PRODUCAO');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "isTestAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "agentes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "papel" "AgentePapel" NOT NULL,
    "nome" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reportsToId" TEXT,
    "capacidadesAtivas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "capacidadesPlanejadas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reunioes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Reuniao',
    "status" "ReuniaoStatus" NOT NULL DEFAULT 'AGENDADA',
    "iniciadaEm" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reunioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" TEXT NOT NULL,
    "reuniaoId" TEXT NOT NULL,
    "agenteId" TEXT,
    "autorNome" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atas" (
    "id" TEXT NOT NULL,
    "reuniaoId" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "decisoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dominioPlataforma" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "IntegracaoStatus" NOT NULL DEFAULT 'PLANEJADA',
    "agentePapelAlvo" "AgentePapel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacoes_kai" (
    "id" TEXT NOT NULL,
    "integracaoId" TEXT NOT NULL,
    "agentePapelAlvo" "AgentePapel" NOT NULL,
    "status" "AprovacaoKaiStatus" NOT NULL DEFAULT 'PENDENTE',
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididoEm" TIMESTAMP(3),
    "decididoPorId" TEXT,
    "motivoRejeicao" TEXT,

    CONSTRAINT "aprovacoes_kai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_propagacao_kai" (
    "id" TEXT NOT NULL,
    "integracaoId" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "ambiente" "AmbientePropagacao" NOT NULL,
    "aprovacaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_propagacao_kai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agentes_businessId_idx" ON "agentes"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "agentes_businessId_papel_key" ON "agentes"("businessId", "papel");

-- CreateIndex
CREATE INDEX "reunioes_businessId_idx" ON "reunioes"("businessId");

-- CreateIndex
CREATE INDEX "mensagens_reuniaoId_idx" ON "mensagens"("reuniaoId");

-- CreateIndex
CREATE UNIQUE INDEX "atas_reuniaoId_key" ON "atas"("reuniaoId");

-- CreateIndex
CREATE UNIQUE INDEX "integracoes_nome_key" ON "integracoes"("nome");

-- CreateIndex
CREATE INDEX "integracoes_status_idx" ON "integracoes"("status");

-- CreateIndex
CREATE INDEX "integracoes_agentePapelAlvo_idx" ON "integracoes"("agentePapelAlvo");

-- CreateIndex
CREATE INDEX "aprovacoes_kai_integracaoId_idx" ON "aprovacoes_kai"("integracaoId");

-- CreateIndex
CREATE INDEX "aprovacoes_kai_status_idx" ON "aprovacoes_kai"("status");

-- CreateIndex
CREATE INDEX "log_propagacao_kai_integracaoId_idx" ON "log_propagacao_kai"("integracaoId");

-- CreateIndex
CREATE INDEX "log_propagacao_kai_agenteId_idx" ON "log_propagacao_kai"("agenteId");

-- AddForeignKey
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "agentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunioes" ADD CONSTRAINT "reunioes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "reunioes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "agentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atas" ADD CONSTRAINT "atas_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "reunioes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_kai" ADD CONSTRAINT "aprovacoes_kai_integracaoId_fkey" FOREIGN KEY ("integracaoId") REFERENCES "integracoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_kai" ADD CONSTRAINT "aprovacoes_kai_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_propagacao_kai" ADD CONSTRAINT "log_propagacao_kai_integracaoId_fkey" FOREIGN KEY ("integracaoId") REFERENCES "integracoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_propagacao_kai" ADD CONSTRAINT "log_propagacao_kai_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "agentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_propagacao_kai" ADD CONSTRAINT "log_propagacao_kai_aprovacaoId_fkey" FOREIGN KEY ("aprovacaoId") REFERENCES "aprovacoes_kai"("id") ON DELETE SET NULL ON UPDATE CASCADE;
