import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('audit:read'), AuditController.listAuditLogs);

export default router;
