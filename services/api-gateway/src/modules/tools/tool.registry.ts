import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'CATALOG' | 'PRICING' | 'ORDERS' | 'CART' | 'SUPPORT';
  parametersSchema: z.ZodObject<any>;
  jsonSchema: Record<string, any>;
}

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  search_products: {
    name: 'search_products',
    description: 'Search merchant catalog for products matching category, keyword query, and budget constraints.',
    category: 'CATALOG',
    parametersSchema: z.object({
      query: z.string().optional().default(''),
      category: z.string().optional(),
      max_price: z.number().optional(),
      min_price: z.number().optional(),
      brand: z.string().optional(),
      limit: z.number().optional().default(5),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords e.g. "running shoes"' },
        category: { type: 'string', description: 'Product category e.g. "Footwear", "Smartphones"' },
        max_price: { type: 'number', description: 'Maximum budget ceiling in INR' },
        min_price: { type: 'number', description: 'Minimum price filter' },
        brand: { type: 'string', description: 'Brand name' },
        limit: { type: 'number', description: 'Max number of items to return' },
      },
    },
  },

  get_product_details: {
    name: 'get_product_details',
    description: 'Retrieve detailed information, variants, attributes, and stock for a specific product ID or handle.',
    category: 'CATALOG',
    parametersSchema: z.object({
      product_id: z.string().optional(),
      handle: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Unique MongoDB Product ID' },
        handle: { type: 'string', description: 'Product handle slug' },
      },
    },
  },

  check_inventory: {
    name: 'check_inventory',
    description: 'Verify current stock availability for a product variant or SKU.',
    category: 'CATALOG',
    parametersSchema: z.object({
      product_id: z.string(),
      variant_id: z.string(),
      quantity: z.number().optional().default(1),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID' },
        variant_id: { type: 'string', description: 'Variant ID or SKU' },
        quantity: { type: 'number', description: 'Desired purchase quantity' },
      },
      required: ['product_id', 'variant_id'],
    },
  },

  calculate_discount: {
    name: 'calculate_discount',
    description: 'Verify coupon validity and calculate discount savings on a given subtotal or cart.',
    category: 'PRICING',
    parametersSchema: z.object({
      coupon_code: z.string(),
      subtotal: z.number(),
      category: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        coupon_code: { type: 'string', description: 'Promo / coupon code e.g. "VOXA10"' },
        subtotal: { type: 'number', description: 'Current subtotal amount in INR' },
        category: { type: 'string', description: 'Primary cart item category' },
      },
      required: ['coupon_code', 'subtotal'],
    },
  },

  calculate_final_price: {
    name: 'calculate_final_price',
    description: 'Calculate deterministic final cart price with subtotal, discounts, GST tax, and shipping.',
    category: 'PRICING',
    parametersSchema: z.object({
      items: z.array(
        z.object({
          product_id: z.string(),
          variant_id: z.string(),
          title: z.string(),
          sku: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
          category: z.string().optional(),
        })
      ),
      coupon_code: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              variant_id: { type: 'string' },
              title: { type: 'string' },
              sku: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              category: { type: 'string' },
            },
            required: ['product_id', 'variant_id', 'quantity', 'unit_price'],
          },
        },
        coupon_code: { type: 'string' },
      },
      required: ['items'],
    },
  },

  get_order_status: {
    name: 'get_order_status',
    description: 'Track shipment and fulfillment status of an order using order number and customer phone.',
    category: 'ORDERS',
    parametersSchema: z.object({
      order_number: z.string(),
      customer_phone: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'Order number e.g. "VF-89214"' },
        customer_phone: { type: 'string', description: 'Registered phone number' },
      },
      required: ['order_number'],
    },
  },

  create_order: {
    name: 'create_order',
    description: 'Confirm and place a customer order with atomic inventory deduction.',
    category: 'ORDERS',
    parametersSchema: z.object({
      customer_name: z.string(),
      customer_phone: z.string(),
      customer_email: z.string().optional(),
      shipping_address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          pincode: z.string().optional(),
        })
        .optional(),
      items: z.array(
        z.object({
          product_id: z.string(),
          variant_id: z.string(),
          quantity: z.number(),
        })
      ),
      coupon_code: z.string().optional(),
      payment_method: z.enum(['COD', 'PREPAID']).optional().default('COD'),
      conversation_id: z.string().optional(),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        customer_phone: { type: 'string' },
        customer_email: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              variant_id: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['product_id', 'variant_id', 'quantity'],
          },
        },
        coupon_code: { type: 'string' },
        payment_method: { type: 'string', enum: ['COD', 'PREPAID'] },
      },
      required: ['customer_name', 'customer_phone', 'items'],
    },
  },

  cancel_order: {
    name: 'cancel_order',
    description: 'Cancel an unfulfilled order and restore inventory.',
    category: 'ORDERS',
    parametersSchema: z.object({
      order_number: z.string(),
      reason: z.string().optional().default('Customer requested cancellation via Voice AI'),
    }),
    jsonSchema: {
      type: 'object',
      properties: {
        order_number: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['order_number'],
    },
  },
};
