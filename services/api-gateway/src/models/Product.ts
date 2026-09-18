import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  variant_id: string;
  title: string;
  sku: string;
  price: number;
  stock_quantity: number;
  attributes: Record<string, string>; // e.g. { size: "9", color: "Black" }
}

export interface IProduct extends Document {
  merchant_id: mongoose.Types.ObjectId;
  title: string;
  handle: string;
  description: string;
  category: string;
  brand: string;
  tags: string[];
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  variants: IProductVariant[];
  images: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  external_source: {
    provider: 'NATIVE' | 'SHOPIFY' | 'WOOCOMMERCE' | 'CUSTOM_REST';
    external_id?: string;
  };
  created_at: Date;
  updated_at: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    variant_id: { type: String, required: true },
    title: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    stock_quantity: { type: Number, default: 0, min: 0 },
    attributes: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    handle: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, index: true },
    brand: { type: String, default: '' },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    compare_at_price: { type: Number },
    cost_price: { type: Number },
    variants: { type: [ProductVariantSchema], default: [] },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    external_source: {
      provider: {
        type: String,
        enum: ['NATIVE', 'SHOPIFY', 'WOOCOMMERCE', 'CUSTOM_REST'],
        default: 'NATIVE',
      },
      external_id: { type: String },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
ProductSchema.index({ merchant_id: 1, handle: 1 }, { unique: true });
ProductSchema.index({ merchant_id: 1, category: 1, price: 1 });
ProductSchema.index({ merchant_id: 1, status: 1 });
ProductSchema.index(
  { title: 'text', description: 'text', tags: 'text', brand: 'text', category: 'text' },
  { weights: { title: 10, tags: 5, category: 3, brand: 3, description: 1 } }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
