import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes.js';
import merchantRoutes from './modules/merchants/merchants.routes.js';
import agentRoutes from './modules/agents/agents.routes.js';
import promptRoutes from './modules/prompts/prompts.routes.js';
import commerceRoutes from './modules/commerce/commerce.routes.js';
import conversationRoutes from './modules/conversations/conversations.routes.js';
import experimentRoutes from './modules/experiments/experiments.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import evaluationRoutes from './modules/evaluations/evaluations.routes.js';
import integrationRoutes from './modules/integrations/integrations.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import userRoutes from './modules/users/users.routes.js';

import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Security and utility middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'VoxaFlow API Gateway & Commerce Core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Domain API Routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/prompts', promptRoutes);
app.use('/api/v1/commerce', commerceRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/experiments', experimentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/evaluations', evaluationRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/users', userRoutes);

// Centralized Structured Error Handler
app.use(errorHandler);

export default app;
