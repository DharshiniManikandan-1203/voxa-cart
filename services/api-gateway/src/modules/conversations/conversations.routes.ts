import { Router } from 'express';
import { ConversationsController } from './conversations.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { enforceTenantContext } from '../../middlewares/tenant.middleware.js';
import { requirePermission } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Playground & Voice Turn endpoints allow scoped tenant execution
router.post('/start', enforceTenantContext, ConversationsController.startConversation);
router.post('/:id/messages', enforceTenantContext, ConversationsController.processTurn);
router.get('/:id', enforceTenantContext, ConversationsController.getConversationById);
router.get('/:id/trace', enforceTenantContext, ConversationsController.getConversationTrace);
router.post('/tools/execute', enforceTenantContext, ConversationsController.executeTool);
router.get('/tools/registry', ConversationsController.getToolRegistry);

// Authenticated session review list
router.get('/', authenticate, enforceTenantContext, requirePermission('conversation:read'), ConversationsController.listConversations);

export default router;
