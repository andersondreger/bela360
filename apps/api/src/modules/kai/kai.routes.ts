import { Router } from 'express';
import { kaiController } from './kai.controller';
import { attachSuperAdminFlag } from '../platform';

const router: Router = Router();

// Todo o painel do Kai e restrito ao administrador da plataforma (Anderson)
router.use(attachSuperAdminFlag);

router.get('/integracoes', (req, res, next) => kaiController.listIntegracoes(req, res, next));
router.post('/integracoes', (req, res, next) => kaiController.createIntegracao(req, res, next));
router.patch('/integracoes/:id/status', (req, res, next) => kaiController.updateStatus(req, res, next));

router.get('/aprovacoes', (req, res, next) => kaiController.listAprovacoes(req, res, next));
router.post('/aprovacoes/:id/aprovar', (req, res, next) => kaiController.approve(req, res, next));
router.post('/aprovacoes/:id/rejeitar', (req, res, next) => kaiController.reject(req, res, next));

router.get('/logs', (req, res, next) => kaiController.listLogs(req, res, next));

export { router as kaiRoutes };
