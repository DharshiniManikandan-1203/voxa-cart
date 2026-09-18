import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../../models/Product.js';
import { Discount } from '../../models/Discount.js';
import { Order } from '../../models/Order.js';
import { DeterministicPricingEngine, PricingItemInput } from './pricing.engine.js';
import { AuditLog } from '../../models/AuditLog.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class CommerceController {
  // PRODUCTS
  public static async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { query, category, brand, min_price, max_price, in_stock, page = 1, limit = 20 } = req.query;

      const filter: Record<string, any> = {};
      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      filter.status = { $ne: 'ARCHIVED' };

      if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
      if (brand) filter.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
      if (min_price || max_price) {
        filter.price = {};
        if (min_price) filter.price.$gte = Number(min_price);
        if (max_price) filter.price.$lte = Number(max_price);
      }
      if (query && String(query).trim()) {
        filter.$text = { $search: String(query).trim() };
      }
      if (in_stock === 'true') {
        filter['variants.stock_quantity'] = { $gt: 0 };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [products, total] = await Promise.all([
        Product.find(filter).skip(skip).limit(Number(limit)).sort({ created_at: -1 }).lean(),
        Product.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const product = await Product.findOne(query).lean();
      if (!product) throw new NotFoundError('Product');

      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const { title, handle, description, category, brand, tags, price, compare_at_price, cost_price, variants, images } =
        req.body;

      if (!title || price === undefined) {
        throw new AppError('Title and price are required', 400, 'VALIDATION_ERROR');
      }

      const slug = handle || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Ensure variant IDs exist
      const formattedVariants = (variants || []).map((v: any, index: number) => ({
        variant_id: v.variant_id || `var_${Date.now()}_${index}`,
        title: v.title || 'Standard',
        sku: v.sku || `${slug.toUpperCase()}-${index + 1}`,
        price: v.price !== undefined ? v.price : price,
        stock_quantity: v.stock_quantity !== undefined ? v.stock_quantity : 10,
        attributes: v.attributes || {},
      }));

      // If no variants provided, create default standard variant
      if (formattedVariants.length === 0) {
        formattedVariants.push({
          variant_id: `var_std_${Date.now()}`,
          title: 'Standard',
          sku: `${slug.toUpperCase()}-STD`,
          price,
          stock_quantity: 20,
          attributes: {},
        });
      }

      const product = await Product.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        title,
        handle: slug,
        description: description || '',
        category: category || 'General',
        brand: brand || '',
        tags: tags || [],
        price,
        compare_at_price,
        cost_price,
        variants: formattedVariants,
        images: images || [],
        status: 'ACTIVE',
      });

      if (req.user) {
        await AuditLog.create({
          merchant_id: product.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'PRODUCT_CREATED',
          resource_type: 'Product',
          resource_id: product._id.toString(),
          details: { title: product.title, price: product.price },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const product = await Product.findOneAndUpdate(query, { $set: req.body }, { new: true, runValidators: true });
      if (!product) throw new NotFoundError('Product');

      if (req.user) {
        await AuditLog.create({
          merchant_id: product.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'PRODUCT_UPDATED',
          resource_type: 'Product',
          resource_id: product._id.toString(),
          details: req.body,
          ip_address: req.ip,
        });
      }

      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  // DISCOUNTS
  public static async listDiscounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const query: Record<string, any> = {};
      if (tenantId) query.merchant_id = new mongoose.Types.ObjectId(tenantId);

      const discounts = await Discount.find(query).sort({ created_at: -1 }).lean();
      res.json({ success: true, data: discounts });
    } catch (err) {
      next(err);
    }
  }

  public static async createDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const { code, title, type, value, min_order_value, max_discount_cap, applicable_categories, usage_limit, expires_at } =
        req.body;

      if (!code || !type || value === undefined) {
        throw new AppError('code, type, and value are required', 400, 'VALIDATION_ERROR');
      }

      const discount = await Discount.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        code: code.toUpperCase().trim(),
        title: title || `${value}% Off`,
        type,
        value,
        min_order_value: min_order_value || 0,
        max_discount_cap,
        applicable_categories: applicable_categories || [],
        usage_limit: usage_limit || 1000,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        status: 'ACTIVE',
      });

      if (req.user) {
        await AuditLog.create({
          merchant_id: discount.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'DISCOUNT_CREATED',
          resource_type: 'Discount',
          resource_id: discount._id.toString(),
          details: { code: discount.code, type: discount.type, value: discount.value },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: discount });
    } catch (err) {
      next(err);
    }
  }

  // DETERMINISTIC PRICING ENGINE CALCULATION ENDPOINT
  public static async calculatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { items, coupon_code } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Array of cart items is required', 400, 'VALIDATION_ERROR');
      }

      let discountDoc = null;
      if (coupon_code && tenantId) {
        discountDoc = await Discount.findOne({
          merchant_id: new mongoose.Types.ObjectId(tenantId),
          code: coupon_code.toUpperCase().trim(),
          status: 'ACTIVE',
        }).lean();
      }

      const pricing = DeterministicPricingEngine.calculate(items as PricingItemInput[], discountDoc);
      res.json({ success: true, data: pricing });
    } catch (err) {
      next(err);
    }
  }

  // ORDERS
  public static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { status, page = 1, limit = 20 } = req.query;
      const filter: Record<string, any> = {};

      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      if (status) filter.fulfillment_status = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [orders, total] = await Promise.all([
        Order.find(filter).skip(skip).limit(Number(limit)).sort({ created_at: -1 }).lean(),
        Order.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
