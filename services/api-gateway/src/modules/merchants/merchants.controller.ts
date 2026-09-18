import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Merchant } from '../../models/Merchant.js';
import { Agent } from '../../models/Agent.js';
import { Product } from '../../models/Product.js';
import { Order } from '../../models/Order.js';
import { Conversation } from '../../models/Conversation.js';
import { AuditLog } from '../../models/AuditLog.js';
import { NotFoundError, AppError, ForbiddenError } from '../../errors/AppError.js';

export class MerchantsController {
  public static async listMerchants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const query: Record<string, any> = {};

      // Non-platform admin only sees their assigned merchant
      if (user && user.role !== 'PLATFORM_ADMIN') {
        if (!user.merchantId) {
          throw new ForbiddenError('No merchant associated with your account');
        }
        query._id = new mongoose.Types.ObjectId(user.merchantId);
      }

      const merchants = await Merchant.find(query).sort({ created_at: -1 }).lean();
      res.json({ success: true, count: merchants.length, data: merchants });
    } catch (err) {
      next(err);
    }
  }

  public static async getMerchantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user && user.role !== 'PLATFORM_ADMIN' && user.merchantId !== id) {
        throw new ForbiddenError('You can only access your own merchant details');
      }

      const merchant = await Merchant.findById(id).lean();
      if (!merchant) {
        throw new NotFoundError('Merchant');
      }

      res.json({ success: true, data: merchant });
    } catch (err) {
      next(err);
    }
  }

  public static async createMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, code, description, industry, currency, supported_languages, contact_info, business_hours } = req.body;

      if (!name || !code) {
        throw new AppError('Merchant name and code are required', 400, 'VALIDATION_ERROR');
      }

      const existing = await Merchant.findOne({ code: code.toLowerCase().trim() });
      if (existing) {
        throw new AppError(`Merchant with code '${code}' already exists`, 409, 'VALIDATION_ERROR');
      }

      const merchant = await Merchant.create({
        name,
        code: code.toLowerCase().trim(),
        description,
        industry: industry || 'GENERAL',
        currency: currency || 'INR',
        supported_languages: supported_languages || ['en-IN', 'hinglish'],
        contact_info: contact_info || { email: 'support@' + code + '.com' },
        business_hours: business_hours || { timezone: 'Asia/Kolkata', open: '09:00', close: '21:00' },
        status: 'ACTIVE',
      });

      if (req.user) {
        await AuditLog.create({
          merchant_id: merchant._id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'MERCHANT_CREATED',
          resource_type: 'Merchant',
          resource_id: merchant._id.toString(),
          details: { name, code, industry },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: merchant });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user && user.role !== 'PLATFORM_ADMIN' && user.merchantId !== id) {
        throw new ForbiddenError('You can only update your own merchant profile');
      }

      const updated = await Merchant.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });
      if (!updated) {
        throw new NotFoundError('Merchant');
      }

      if (user) {
        await AuditLog.create({
          merchant_id: updated._id,
          actor_id: new mongoose.Types.ObjectId(user.userId),
          actor_email: user.email,
          action: 'MERCHANT_UPDATED',
          resource_type: 'Merchant',
          resource_id: updated._id.toString(),
          details: req.body,
          ip_address: req.ip,
        });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async getMerchantStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const mId = new mongoose.Types.ObjectId(id);

      const [agentsCount, productsCount, ordersCount, conversationsCount] = await Promise.all([
        Agent.countDocuments({ merchant_id: mId, status: 'ACTIVE' }),
        Product.countDocuments({ merchant_id: mId, status: 'ACTIVE' }),
        Order.countDocuments({ merchant_id: mId }),
        Conversation.countDocuments({ merchant_id: mId }),
      ]);

      const completedOrders = await Order.find({
        merchant_id: mId,
        fulfillment_status: { $ne: 'CANCELLED' },
      }).lean();

      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.pricing?.grand_total || 0), 0);

      res.json({
        success: true,
        data: {
          merchant_id: id,
          active_agents: agentsCount,
          total_products: productsCount,
          total_orders: ordersCount,
          total_conversations: conversationsCount,
          total_revenue: Math.round(totalRevenue * 100) / 100,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
