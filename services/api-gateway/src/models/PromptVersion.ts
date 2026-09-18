import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
}

export interface IPromptVersion extends Document {
  template_id: mongoose.Types.ObjectId;
  merchant_id: mongoose.Types.ObjectId;
  version_number: number;
  system_prompt_raw: string;
  variables: IPromptVariable[];
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'EXPERIMENT';
  change_description: string;
  author_id?: mongoose.Types.ObjectId;
  metrics: {
    total_calls: number;
    avg_latency_ms: number;
    task_completion_rate: number;
    fallback_rate: number;
  };
  created_at: Date;
}

const PromptVariableSchema = new Schema<IPromptVariable>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    required: { type: Boolean, default: false },
    default_value: { type: String },
  },
  { _id: false }
);

const PromptVersionSchema = new Schema<IPromptVersion>(
  {
    template_id: { type: Schema.Types.ObjectId, ref: 'PromptTemplate', required: true, index: true },
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    version_number: { type: Number, required: true },
    system_prompt_raw: { type: String, required: true },
    variables: { type: [PromptVariableSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'EXPERIMENT'],
      default: 'DRAFT',
    },
    change_description: { type: String, default: 'Initial version' },
    author_id: { type: Schema.Types.ObjectId, ref: 'User' },
    metrics: {
      total_calls: { type: Number, default: 0 },
      avg_latency_ms: { type: Number, default: 0 },
      task_completion_rate: { type: Number, default: 0 },
      fallback_rate: { type: Number, default: 0 },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PromptVersionSchema.index({ template_id: 1, version_number: 1 }, { unique: true });
PromptVersionSchema.index({ merchant_id: 1, status: 1 });

export const PromptVersion = mongoose.model<IPromptVersion>('PromptVersion', PromptVersionSchema);
