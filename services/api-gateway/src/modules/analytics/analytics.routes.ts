import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/dashboard', requirePermission('analytics:read'), AnalyticsController.getDashboardStats);

export default router;
