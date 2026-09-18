import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  merchant_id?: mongoose.Types.ObjectId; // null for platform admin
  name: string;
  email: string;
  password_hash: string;
  role_id: mongoose.Types.ObjectId;
  role?: string; // virtual/computed for convenience
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'DISABLED'],
      default: 'ACTIVE',
    },
    last_login_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

UserSchema.index({ merchant_id: 1, status: 1 });

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password_hash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
