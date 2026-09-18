import { Router } from 'express';
import { EvaluationsController } from './evaluations.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('analytics:read'), EvaluationsController.listEvaluations);
router.post('/run', requirePermission('prompt:eval'), EvaluationsController.runEvaluation);

export default router;
