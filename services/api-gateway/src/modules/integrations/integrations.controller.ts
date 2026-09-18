import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { APIIntegration } from '../../models/APIIntegration.js';
import { ShopifyProductProvider } from './commerce.adapter.js';
import { AuditLog } from '../../models/AuditLog.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class IntegrationsController {
  public static async listIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const filter: Record<string, any> = {};
      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);

      const integrations = await APIIntegration.find(filter).lean();
      res.json({ success: true, data: integrations });
    } catch (err) {
      next(err);
    }
  }

  public static async saveIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const { provider, auth_type, shop_domain, api_key, api_secret, access_token, endpoint_url, sync_settings } = req.body;

      if (!provider) throw new AppError('provider is required', 400, 'VALIDATION_ERROR');

      const updated = await APIIntegration.findOneAndUpdate(
        {
          merchant_id: new mongoose.Types.ObjectId(tenantId),
          provider,
        },
        {
          merchant_id: new mongoose.Types.ObjectId(tenantId),
          provider,
          auth_type: auth_type || 'API_KEY_SECRET',
          encrypted_credentials: {
            shop_domain,
            api_key,
            api_secret,
            access_token,
            endpoint_url,
          },
          sync_settings: sync_settings || {
            sync_products: true,
            sync_inventory: true,
            sync_orders: true,
            auto_sync_interval_mins: 60,
          },
          status: 'CONNECTED',
        },
        { upsert: true, new: true }
      );

      if (req.user) {
        await AuditLog.create({
          merchant_id: updated.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'INTEGRATION_SAVED',
          resource_type: 'APIIntegration',
          resource_id: updated._id.toString(),
          details: { provider, status: 'CONNECTED' },
          ip_address: req.ip,
        });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const shopifyProvider = new ShopifyProductProvider();
      const syncResult = await shopifyProvider.syncCatalog(tenantId);

      res.json({ success: true, message: 'Shopify catalogue sync completed', data: syncResult });
    } catch (err) {
      next(err);
    }
  }
}
