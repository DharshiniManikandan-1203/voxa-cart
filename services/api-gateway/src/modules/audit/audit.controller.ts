import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuditLog } from '../../models/AuditLog.js';

export class AuditController {
  public static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const tenantId = req.tenantId;
      const { action, resource_type, limit = 50 } = req.query;

      const filter: Record<string, any> = {};

      if (user && user.role !== 'PLATFORM_ADMIN') {
        if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      } else if (tenantId) {
        filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      }

      if (action) filter.action = action;
      if (resource_type) filter.resource_type = resource_type;

      const logs = await AuditLog.find(filter)
        .populate('merchant_id', 'name code')
        .populate('actor_id', 'name email')
        .sort({ created_at: -1 })
        .limit(Number(limit))
        .lean();

      res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }
}
