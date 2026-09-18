import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscount extends Document {
  merchant_id: mongoose.Types.ObjectId;
  code: string;
  title: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number; // e.g. 10 for 10% or 200 for ₹200
  min_order_value: number;
  max_discount_cap?: number; // e.g. max ₹500 discount for percentage coupons
  applicable_categories: string[];
  usage_limit: number;
  times_used: number;
  starts_at: Date;
  expires_at?: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  created_at: Date;
  updated_at: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, default: '' },
    type: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    min_order_value: { type: Number, default: 0, min: 0 },
    max_discount_cap: { type: Number },
    applicable_categories: { type: [String], default: [] },
    usage_limit: { type: Number, default: 1000 },
    times_used: { type: Number, default: 0 },
    starts_at: { type: Date, default: Date.now },
    expires_at: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'DISABLED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

DiscountSchema.index({ merchant_id: 1, code: 1 }, { unique: true });
DiscountSchema.index({ merchant_id: 1, status: 1 });

export const Discount = mongoose.model<IDiscount>('Discount', DiscountSchema);
