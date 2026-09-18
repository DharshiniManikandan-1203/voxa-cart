import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchant extends Document {
  name: string;
  code: string;
  description?: string;
  industry: 'FASHION' | 'ELECTRONICS' | 'GROCERY' | 'BEAUTY' | 'GENERAL';
  currency: string;
  supported_languages: string[];
  business_hours: {
    timezone: string;
    open: string;
    close: string;
  };
  contact_info: {
    email: string;
    phone?: string;
    support_url?: string;
  };
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  settings: {
    max_concurrent_calls: number;
    default_fallback_phone?: string;
  };
  created_at: Date;
  updated_at: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    industry: {
      type: String,
      enum: ['FASHION', 'ELECTRONICS', 'GROCERY', 'BEAUTY', 'GENERAL'],
      default: 'GENERAL',
    },
    currency: { type: String, default: 'INR' },
    supported_languages: { type: [String], default: ['en-IN', 'hinglish'] },
    business_hours: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
    },
    contact_info: {
      email: { type: String, required: true },
      phone: { type: String },
      support_url: { type: String },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'],
      default: 'ACTIVE',
    },
    settings: {
      max_concurrent_calls: { type: Number, default: 10 },
      default_fallback_phone: { type: String },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

MerchantSchema.index({ status: 1 });

export const Merchant = mongoose.model<IMerchant>('Merchant', MerchantSchema);
