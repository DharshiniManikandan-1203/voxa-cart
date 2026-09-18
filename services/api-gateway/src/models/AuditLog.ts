import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  merchant_id?: mongoose.Types.ObjectId;
  actor_id?: mongoose.Types.ObjectId;
  actor_email?: string;
  action: string; // e.g. "PROMPT_VERSION_ACTIVATED", "AGENT_UPDATED", "DISCOUNT_CREATED"
  resource_type: string; // e.g. "Agent", "PromptVersion", "Discount", "Order"
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', default: null, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    actor_email: { type: String },
    action: { type: String, required: true },
    resource_type: { type: String, required: true },
    resource_id: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ip_address: { type: String },
    user_agent: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ merchant_id: 1, created_at: -1 });
AuditLogSchema.index({ actor_id: 1, created_at: -1 });
AuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
