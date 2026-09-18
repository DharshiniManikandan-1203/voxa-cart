import mongoose, { Schema, Document } from 'mongoose';

export type SystemRoleName =
  | 'PLATFORM_ADMIN'
  | 'MERCHANT_ADMIN'
  | 'MERCHANT_MANAGER'
  | 'AGENT_MANAGER'
  | 'SUPPORT_AGENT'
  | 'CUSTOMER';

export interface IRole extends Document {
  name: SystemRoleName | string;
  description: string;
  permissions: string[];
  is_system: boolean;
  merchant_id?: mongoose.Types.ObjectId; // null for platform system roles
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [] },
    is_system: { type: Boolean, default: false },
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', default: null },
  },
  {
    timestamps: true,
  }
);

RoleSchema.index({ name: 1, merchant_id: 1 }, { unique: true });

export const Role = mongoose.model<IRole>('Role', RoleSchema);
