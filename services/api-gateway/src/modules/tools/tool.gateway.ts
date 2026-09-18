import mongoose from 'mongoose';
import { TOOL_DEFINITIONS } from './tool.registry.js';
import { Product } from '../../models/Product.js';
import { Discount } from '../../models/Discount.js';
import { Order } from '../../models/Order.js';
import { ToolExecution } from '../../models/ToolExecution.js';
import { DeterministicPricingEngine, PricingItemInput } from '../commerce/pricing.engine.js';
import { ToolExecutionError, AppError } from '../../errors/AppError.js';

export interface ToolExecutionParams {
  merchantId: string;
  conversationId?: string;
  toolName: string;
  arguments: Record<string, any>;
  allowedTools?: string[];
}

export interface ToolExecutionResponse {
  success: boolean;
  tool_name: string;
  result: any;
  error?: string;
  execution_time_ms: number;
}

export class ToolExecutionGateway {
  /**
   * Executes a controlled tool in a sandboxed, validated environment with tenant scoping.
   */
  public static async execute(params: ToolExecutionParams): Promise<ToolExecutionResponse> {
    const startTime = Date.now();
    const { merchantId, conversationId, toolName, arguments: rawArgs, allowedTools } = params;

    if (allowedTools && allowedTools.length > 0 && !allowedTools.includes(toolName)) {
      throw new ToolExecutionError(toolName, `Agent is not authorized to execute tool [${toolName}]`);
    }

    const toolDef = TOOL_DEFINITIONS[toolName];
    if (!toolDef) {
      throw new ToolExecutionError(toolName, `Unrecognized tool [${toolName}]`);
    }

    const validationResult = toolDef.parametersSchema.safeParse(rawArgs);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(`Invalid arguments for tool [${toolName}]: ${errorMsg}`, 400, 'TOOL_VALIDATION_ERROR', {
        errors: validationResult.error.errors,
      });
    }

    const validatedArgs = validationResult.data;
    let result: any = null;
    let executionStatus: 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR' = 'SUCCESS';
    let errorMessage: string | undefined = undefined;

    try {
      switch (toolName) {
        case 'search_products': {
          const { query, category, max_price, min_price, brand, limit } = validatedArgs;
          const filter: Record<string, any> = {
            merchant_id: new mongoose.Types.ObjectId(merchantId),
            status: 'ACTIVE',
          };

          if (category) {
            filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
          }
          if (brand) {
            filter.brand = { $regex: new RegExp(brand, 'i') };
          }
          if (max_price !== undefined || min_price !== undefined) {
            filter.price = {};
            if (max_price !== undefined) filter.price.$lte = max_price;
            if (min_price !== undefined) filter.price.$gte = min_price;
          }

          // Smart keyword matching
          if (query && query.trim() && !category) {
            const stopWords = new Set([
              'mujhe', 'chahiye', 'dikhao', 'dikhaye', 'under', 'below', 'mein', 'kuch', 'hai', 'show', 'me', 'want',
              'i', 'for', 'the', 'a', 'an', 'please', 'color', 'colour', 'tak', 'budget', 'rupay', 'price',
            ]);
            const words = query
              .toLowerCase()
              .replace(/[^a-zA-Z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter((w: string) => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

            if (words.length > 0) {
              const regexConditions = words.map((w: string) => {
                const r = new RegExp(w, 'i');
                return { $or: [{ title: r }, { description: r }, { tags: r }, { category: r }, { brand: r }] };
              });
              filter.$or = regexConditions.flatMap((c) => c.$or);
            }
          }

          const products = await Product.find(filter)
            .limit(limit || 5)
            .lean();

          result = {
            total_found: products.length,
            products: products.map((p) => ({
              id: p._id.toString(),
              title: p.title,
              category: p.category,
              brand: p.brand,
              price: p.price,
              compare_at_price: p.compare_at_price,
              description: p.description,
              variants_count: p.variants.length,
              in_stock: p.variants.some((v) => v.stock_quantity > 0),
              variants: p.variants.map((v) => ({
                variant_id: v.variant_id,
                title: v.title,
                sku: v.sku,
                price: v.price,
                stock: v.stock_quantity,
                attributes: v.attributes,
              })),
            })),
          };
          break;
        }

        case 'get_product_details': {
          const { product_id, handle } = validatedArgs;
          const query: Record<string, any> = { merchant_id: new mongoose.Types.ObjectId(merchantId) };
          if (product_id && mongoose.isValidObjectId(product_id)) {
            query._id = new mongoose.Types.ObjectId(product_id);
          } else if (handle) {
            query.handle = handle.toLowerCase();
          } else {
            result = { found: false, message: 'Invalid product_id or handle format' };
            break;
          }

          const product = await Product.findOne(query).lean();
          if (!product) {
            result = { found: false, message: 'Product not found in this store catalog' };
          } else {
            result = {
              found: true,
              product: {
                id: product._id.toString(),
                title: product.title,
                handle: product.handle,
                description: product.description,
                category: product.category,
                brand: product.brand,
                price: product.price,
                compare_at_price: product.compare_at_price,
                variants: product.variants,
                tags: product.tags,
              },
            };
          }
          break;
        }

        case 'check_inventory': {
          const { product_id, variant_id, quantity } = validatedArgs;
          const product = await Product.findOne({
            _id: new mongoose.Types.ObjectId(product_id),
            merchant_id: new mongoose.Types.ObjectId(merchantId),
          }).lean();

          if (!product) {
            result = { available: false, in_stock: 0, message: 'Product not found' };
          } else {
            const variant = product.variants.find((v) => v.variant_id === variant_id || v.sku === variant_id);
            if (!variant) {
              result = { available: false, in_stock: 0, message: 'Variant not found' };
            } else {
              const inStock = variant.stock_quantity >= (quantity || 1);
              result = {
                available: inStock,
                current_stock: variant.stock_quantity,
                requested_quantity: quantity || 1,
                variant_title: variant.title,
                price: variant.price,
              };
            }
          }
          break;
        }

        case 'calculate_discount': {
          const { coupon_code, subtotal, category } = validatedArgs;
          const discount = await Discount.findOne({
            merchant_id: new mongoose.Types.ObjectId(merchantId),
            code: coupon_code.toUpperCase().trim(),
            status: 'ACTIVE',
          }).lean();

          if (!discount) {
            result = {
              valid: false,
              discount_amount: 0,
              message: `Coupon code '${coupon_code}' is invalid or expired for this store.`,
            };
          } else {
            const pricing = DeterministicPricingEngine.calculate(
              [
                {
                  product_id: 'dummy',
                  variant_id: 'dummy',
                  title: 'Cart Total Item',
                  sku: 'CART-1',
                  quantity: 1,
                  unit_price: subtotal,
                  category,
                },
              ],
              discount
            );
            result = {
              valid: pricing.discount_total > 0 || discount.type === 'FREE_SHIPPING',
              coupon_code: discount.code,
              discount_type: discount.type,
              discount_amount: pricing.discount_total,
              new_subtotal: pricing.grand_total,
              description: pricing.coupon_applied?.description || 'Coupon applied',
            };
          }
          break;
        }

        case 'calculate_final_price': {
          const { items, coupon_code } = validatedArgs;
          let discountDoc = null;
          if (coupon_code) {
            discountDoc = await Discount.findOne({
              merchant_id: new mongoose.Types.ObjectId(merchantId),
              code: coupon_code.toUpperCase().trim(),
              status: 'ACTIVE',
            }).lean();
          }

          const pricing = DeterministicPricingEngine.calculate(items as PricingItemInput[], discountDoc);
          result = pricing;
          break;
        }

        case 'get_order_status': {
          const { order_number, customer_phone } = validatedArgs;
          const query: Record<string, any> = {
            merchant_id: new mongoose.Types.ObjectId(merchantId),
            order_number: order_number.trim(),
          };
          if (customer_phone) {
            query['customer.phone'] = { $regex: customer_phone.replace(/\D/g, '') };
          }

          const order = await Order.findOne(query).lean();
          if (!order) {
            result = {
              found: false,
              message: `No active order found with number #${order_number}.`,
            };
          } else {
            result = {
              found: true,
              order_number: order.order_number,
              customer_name: order.customer.name,
              fulfillment_status: order.fulfillment_status,
              payment_status: order.payment_status,
              items_count: order.items.length,
              grand_total: order.pricing.grand_total,
              created_at: order.created_at,
              estimated_delivery: '2-4 business days',
            };
          }
          break;
        }

        case 'create_order': {
          const { customer_name, customer_phone, customer_email, shipping_address, items, coupon_code, payment_method } =
            validatedArgs;

          const productIds = items.map((it: any) => new mongoose.Types.ObjectId(it.product_id));
          const products = await Product.find({
            _id: { $in: productIds },
            merchant_id: new mongoose.Types.ObjectId(merchantId),
          });

          const pricingItems: PricingItemInput[] = [];
          const orderItems: any[] = [];

          for (const it of items) {
            const p = products.find((prod) => prod._id.toString() === it.product_id);
            if (!p) throw new ToolExecutionError(toolName, `Product not found: ${it.product_id}`);
            const v = p.variants.find((vr) => vr.variant_id === it.variant_id || vr.sku === it.variant_id);
            if (!v) throw new ToolExecutionError(toolName, `Variant not found: ${it.variant_id}`);
            if (v.stock_quantity < it.quantity) {
              throw new ToolExecutionError(
                toolName,
                `Insufficient inventory for '${p.title} (${v.title})'. Available: ${v.stock_quantity}`
              );
            }

            pricingItems.push({
              product_id: p._id.toString(),
              variant_id: v.variant_id,
              title: `${p.title} - ${v.title}`,
              sku: v.sku,
              quantity: it.quantity,
              unit_price: v.price,
              category: p.category,
            });

            orderItems.push({
              product_id: p._id,
              variant_id: v.variant_id,
              sku: v.sku,
              title: `${p.title} - ${v.title}`,
              quantity: it.quantity,
              unit_price: v.price,
              total_price: v.price * it.quantity,
            });
          }

          let discountDoc = null;
          if (coupon_code) {
            discountDoc = await Discount.findOne({
              merchant_id: new mongoose.Types.ObjectId(merchantId),
              code: coupon_code.toUpperCase().trim(),
              status: 'ACTIVE',
            }).lean();
          }

          const pricing = DeterministicPricingEngine.calculate(pricingItems, discountDoc);

          for (const it of items) {
            await Product.updateOne(
              {
                _id: new mongoose.Types.ObjectId(it.product_id),
                merchant_id: new mongoose.Types.ObjectId(merchantId),
                'variants.variant_id': it.variant_id,
              },
              {
                $inc: { 'variants.$.stock_quantity': -it.quantity },
              }
            );
          }

          const orderNumber = `VF-${Math.floor(100000 + Math.random() * 900000)}`;
          const newOrder = await Order.create({
            merchant_id: new mongoose.Types.ObjectId(merchantId),
            order_number: orderNumber,
            conversation_id:
              conversationId && mongoose.isValidObjectId(conversationId)
                ? new mongoose.Types.ObjectId(conversationId)
                : undefined,
            customer: {
              name: customer_name,
              phone: customer_phone,
              email: customer_email,
              shipping_address: shipping_address || {
                street: 'Main Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
              },
            },
            items: orderItems,
            pricing: {
              subtotal: pricing.subtotal,
              discount_total: pricing.discount_total,
              coupon_applied: pricing.coupon_applied?.code,
              tax_amount: pricing.tax_amount,
              shipping_fee: pricing.shipping_fee,
              grand_total: pricing.grand_total,
            },
            payment_status: payment_method === 'PREPAID' ? 'PAID' : 'COD',
            fulfillment_status: 'PROCESSING',
          });

          result = {
            order_placed: true,
            order_number: newOrder.order_number,
            grand_total: pricing.grand_total,
            items_count: orderItems.length,
            delivery_estimate: '2-4 business days',
            message: `Order #${newOrder.order_number} successfully placed for ${customer_name}!`,
          };
          break;
        }

        case 'cancel_order': {
          const { order_number, reason } = validatedArgs;
          const order = await Order.findOne({
            merchant_id: new mongoose.Types.ObjectId(merchantId),
            order_number: order_number.trim(),
          });

          if (!order) {
            result = { success: false, message: `Order #${order_number} not found.` };
          } else if (order.fulfillment_status === 'SHIPPED' || order.fulfillment_status === 'DELIVERED') {
            result = {
              success: false,
              message: `Order #${order_number} cannot be cancelled because it is already ${order.fulfillment_status.toLowerCase()}.`,
            };
          } else if (order.fulfillment_status === 'CANCELLED') {
            result = { success: false, message: `Order #${order_number} is already cancelled.` };
          } else {
            order.fulfillment_status = 'CANCELLED';
            order.notes = reason;
            await order.save();

            for (const item of order.items) {
              await Product.updateOne(
                {
                  _id: item.product_id,
                  merchant_id: new mongoose.Types.ObjectId(merchantId),
                  'variants.variant_id': item.variant_id,
                },
                {
                  $inc: { 'variants.$.stock_quantity': item.quantity },
                }
              );
            }

            result = {
              success: true,
              order_number: order.order_number,
              message: `Order #${order.order_number} has been cancelled and items returned to inventory.`,
            };
          }
          break;
        }

        default:
          throw new ToolExecutionError(toolName, `Tool handler not implemented for [${toolName}]`);
      }
    } catch (err: any) {
      executionStatus = 'FAILED';
      errorMessage = err.message || 'Tool execution failure';
      result = { error: errorMessage };
    }

    const durationMs = Date.now() - startTime;

    if (conversationId && mongoose.isValidObjectId(conversationId)) {
      try {
        await ToolExecution.create({
          conversation_id: new mongoose.Types.ObjectId(conversationId),
          merchant_id: new mongoose.Types.ObjectId(merchantId),
          tool_name: toolName,
          input_arguments: validatedArgs,
          output_result: result,
          execution_status: executionStatus,
          error_message: errorMessage,
          execution_duration_ms: durationMs,
        });
      } catch (logErr) {
        console.error('[Tool Telemetry Error] Failed to log tool execution:', logErr);
      }
    }

    return {
      success: executionStatus === 'SUCCESS',
      tool_name: toolName,
      result,
      error: errorMessage,
      execution_time_ms: durationMs,
    };
  }
}
