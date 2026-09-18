import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product_id: mongoose.Types.ObjectId;
  variant_id: string;
  sku: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface IOrderPricing {
  subtotal: number;
  discount_total: number;
  coupon_applied?: string;
  tax_amount: number;
  shipping_fee: number;
  grand_total: number;
}

export interface IOrder extends Document {
  merchant_id: mongoose.Types.ObjectId;
  order_number: string;
  conversation_id?: mongoose.Types.ObjectId;
  customer: {
    name: string;
    phone: string;
    email?: string;
    shipping_address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  items: IOrderItem[];
  pricing: IOrderPricing;
  payment_status: 'PENDING' | 'PAID' | 'COD' | 'FAILED';
  fulfillment_status: 'UNFULFILLED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant_id: { type: String, required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount_total: { type: Number, default: 0, min: 0 },
    coupon_applied: { type: String },
    tax_amount: { type: Number, default: 0, min: 0 },
    shipping_fee: { type: Number, default: 0, min: 0 },
    grand_total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    order_number: { type: String, required: true, trim: true },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      shipping_address: {
        street: { type: String, default: '' },
        city: { type: String, default: 'Mumbai' },
        state: { type: String, default: 'Maharashtra' },
        pincode: { type: String, default: '400001' },
      },
    },
    items: { type: [OrderItemSchema], default: [] },
    pricing: { type: OrderPricingSchema, required: true },
    payment_status: {
      type: String,
      enum: ['PENDING', 'PAID', 'COD', 'FAILED'],
      default: 'COD',
    },
    fulfillment_status: {
      type: String,
      enum: ['UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PROCESSING',
    },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

OrderSchema.index({ merchant_id: 1, order_number: 1 }, { unique: true });
OrderSchema.index({ merchant_id: 1, 'customer.phone': 1 });
OrderSchema.index({ merchant_id: 1, fulfillment_status: 1 });
OrderSchema.index({ merchant_id: 1, created_at: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
