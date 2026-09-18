import { Router } from 'express';
import { CommerceController } from './commerce.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Public / Playground product search and pricing calculation support optional tenant header
router.get('/products', enforceTenantContext, CommerceController.listProducts);
router.get('/products/:id', enforceTenantContext, CommerceController.getProductById);
router.post('/pricing/calculate', enforceTenantContext, CommerceController.calculatePrice);

// Admin-managed routes require authentication & tenant context
router.post('/products', authenticate, enforceTenantContext, requirePermission('product:manage'), CommerceController.createProduct);
router.patch('/products/:id', authenticate, enforceTenantContext, requirePermission('product:manage'), CommerceController.updateProduct);

router.get('/discounts', authenticate, enforceTenantContext, requirePermission('discount:manage'), CommerceController.listDiscounts);
router.post('/discounts', authenticate, enforceTenantContext, requirePermission('discount:manage'), CommerceController.createDiscount);

router.get('/orders', authenticate, enforceTenantContext, requirePermission('order:manage'), CommerceController.listOrders);

export default router;
