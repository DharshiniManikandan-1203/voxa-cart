import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptTemplate extends Document {
  merchant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  latest_version_number: number;
  active_version_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PromptTemplateSchema = new Schema<IPromptTemplate>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    latest_version_number: { type: Number, default: 1 },
    active_version_id: { type: Schema.Types.ObjectId, ref: 'PromptVersion' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

PromptTemplateSchema.index({ merchant_id: 1, agent_id: 1 });

export const PromptTemplate = mongoose.model<IPromptTemplate>('PromptTemplate', PromptTemplateSchema);
