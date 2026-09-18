import { Router } from 'express';
import { ExperimentsController } from './experiments.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('experiment:manage'), ExperimentsController.listExperiments);
router.get('/:id', requirePermission('experiment:manage'), ExperimentsController.getExperimentById);
router.post('/', requirePermission('experiment:manage'), ExperimentsController.createExperiment);
router.patch('/:id/complete', requirePermission('experiment:manage'), ExperimentsController.completeExperiment);

export default router;
