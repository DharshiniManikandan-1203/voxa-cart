import { Router } from 'express';
import { IntegrationsController } from './integrations.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('integration:manage'), IntegrationsController.listIntegrations);
router.post('/', requirePermission('integration:manage'), IntegrationsController.saveIntegration);
router.post('/sync', requirePermission('integration:manage'), IntegrationsController.triggerSync);

export default router;
