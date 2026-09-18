import { Router } from 'express';
import { AgentsController } from './agents.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext, requireTenant } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('agent:manage'), AgentsController.listAgents);
router.post('/', requirePermission('agent:manage'), AgentsController.createAgent);
router.get('/:id', requirePermission('agent:manage'), AgentsController.getAgentById);
router.patch('/:id', requirePermission('agent:manage'), AgentsController.updateAgent);
router.delete('/:id', requirePermission('agent:manage'), AgentsController.deleteAgent);

export default router;
