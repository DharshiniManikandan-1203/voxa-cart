import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantContext);

router.get('/', requirePermission('user:manage'), UsersController.listUsers);
router.post('/', requirePermission('user:manage'), UsersController.inviteUser);
router.get('/roles', UsersController.listRoles);

export default router;
