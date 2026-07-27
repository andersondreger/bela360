import { Request, Response, NextFunction } from 'express';
import { agentesService } from './agentes.service';

export class AgentesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const agentes = await agentesService.listByBusiness(businessId);
      res.json({ success: true, data: agentes });
    } catch (error) {
      next(error);
    }
  }
}

export const agentesController = new AgentesController();
