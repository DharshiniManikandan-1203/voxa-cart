import mongoose, { Schema, Document } from 'mongoose';

export interface IAPIIntegration extends Document {
  merchant_id: mongoose.Types.ObjectId;
  provider: 'SHOPIFY' | 'WOOCOMMERCE' | 'CUSTOM_REST';
  auth_type: 'API_KEY_SECRET' | 'OAUTH2' | 'BEARER_TOKEN';
  encrypted_credentials: {
    api_key?: string;
    api_secret?: string;
    shop_domain?: string;
    access_token?: string;
    endpoint_url?: string;
  };
  sync_settings: {
    sync_products: boolean;
    sync_inventory: boolean;
    sync_orders: boolean;
    auto_sync_interval_mins: number;
  };
  last_synced_at?: Date;
  status: 'CONNECTED' | 'FAILED' | 'DISCONNECTED';
  created_at: Date;
  updated_at: Date;
}

const APIIntegrationSchema = new Schema<IAPIIntegration>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    provider: {
      type: String,
      enum: ['SHOPIFY', 'WOOCOMMERCE', 'CUSTOM_REST'],
      required: true,
    },
    auth_type: {
      type: String,
      enum: ['API_KEY_SECRET', 'OAUTH2', 'BEARER_TOKEN'],
      default: 'API_KEY_SECRET',
    },
    encrypted_credentials: {
      api_key: { type: String },
      api_secret: { type: String },
      shop_domain: { type: String },
      access_token: { type: String },
      endpoint_url: { type: String },
    },
    sync_settings: {
      sync_products: { type: Boolean, default: true },
      sync_inventory: { type: Boolean, default: true },
      sync_orders: { type: Boolean, default: true },
      auto_sync_interval_mins: { type: Number, default: 60 },
    },
    last_synced_at: { type: Date },
    status: {
      type: String,
      enum: ['CONNECTED', 'FAILED', 'DISCONNECTED'],
      default: 'DISCONNECTED',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

APIIntegrationSchema.index({ merchant_id: 1, provider: 1 }, { unique: true });

export const APIIntegration = mongoose.model<IAPIIntegration>('APIIntegration', APIIntegrationSchema);
