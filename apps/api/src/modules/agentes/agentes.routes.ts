import { Router } from 'express';
import { agentesController } from './agentes.controller';

const router: Router = Router();

// Lista os 6 agentes do business autenticado, com suas capacidades ativas/planejadas
router.get('/', (req, res, next) => agentesController.getAll(req, res, next));

export { router as agentesRoutes };
