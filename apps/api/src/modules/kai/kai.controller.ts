import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AgentePapel, IntegracaoStatus } from '@prisma/client';
import { kaiService } from './kai.service';
import { AuthorizationError } from '../../common/errors';

const createIntegracaoSchema = z.object({
  nome: z.string().min(3).max(80),
  dominioPlataforma: z.string().min(3).max(255),
  descricao: z.string().max(500).optional(),
  agentePapelAlvo: z.nativeEnum(AgentePapel),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(IntegracaoStatus),
});

const rejectSchema = z.object({
  motivo: z.string().max(500).optional(),
});

const statusQuerySchema = z.enum(['PENDENTE', 'APROVADO', 'REJEITADO']).optional();

function assertSuperAdmin(req: Request) {
  if (!req.superAdmin) {
    throw new AuthorizationError('Kai e o painel de aprovacao dele sao restritos ao administrador da plataforma');
  }
}

export class KaiController {
  async listIntegracoes(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const integracoes = await kaiService.listIntegracoes();
      res.json({ success: true, data: integracoes });
    } catch (error) {
      next(error);
    }
  }

  async createIntegracao(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const data = createIntegracaoSchema.parse(req.body);
      const integracao = await kaiService.createIntegracao(data);
      res.status(201).json({ success: true, data: integracao });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const { status } = updateStatusSchema.parse(req.body);
      const integracao = await kaiService.updateStatus(req.params.id, status);
      res.json({ success: true, data: integracao });
    } catch (error) {
      next(error);
    }
  }

  async listAprovacoes(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const status = statusQuerySchema.parse(req.query.status);
      const aprovacoes = await kaiService.listAprovacoes(status);
      res.json({ success: true, data: aprovacoes });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const aprovacao = await kaiService.approve(req.params.id, req.user!.userId);
      res.json({ success: true, data: aprovacao });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const { motivo } = rejectSchema.parse(req.body);
      const aprovacao = await kaiService.reject(req.params.id, req.user!.userId, motivo);
      res.json({ success: true, data: aprovacao });
    } catch (error) {
      next(error);
    }
  }

  async listLogs(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const integracaoId = typeof req.query.integracaoId === 'string' ? req.query.integracaoId : undefined;
      const logs = await kaiService.listLogs(integracaoId);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }
}

export const kaiController = new KaiController();
