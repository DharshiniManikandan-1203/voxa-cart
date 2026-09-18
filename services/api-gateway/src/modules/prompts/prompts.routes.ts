import { Router } from 'express';
import { PromptsController } from './prompts.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('prompt:manage'), PromptsController.listTemplates);
router.post('/', requirePermission('prompt:manage'), PromptsController.createTemplate);
router.get('/:id', requirePermission('prompt:manage'), PromptsController.getTemplateById);
router.post('/:id/versions', requirePermission('prompt:manage'), PromptsController.commitNewVersion);
router.post('/:id/versions/:versionId/activate', requirePermission('prompt:manage'), PromptsController.activateVersion);
router.post('/preview/compile', requirePermission('prompt:manage'), PromptsController.compilePreview);

export default router;
