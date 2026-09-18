import { Router } from 'express';
import { MerchantsController } from './merchants.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext, requireTenant } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('tenant:manage'), MerchantsController.listMerchants);
router.post('/', requirePermission('tenant:manage'), MerchantsController.createMerchant);
router.get('/:id', requirePermission('tenant:manage'), MerchantsController.getMerchantById);
router.patch('/:id', requirePermission('tenant:manage'), MerchantsController.updateMerchant);
router.get('/:id/stats', requirePermission('tenant:manage'), MerchantsController.getMerchantStats);

export default router;
