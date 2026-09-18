import mongoose, { Schema, Document } from 'mongoose';

export interface IVariantMetric {
  prompt_version_id: mongoose.Types.ObjectId;
  version_number?: number;
  sample_count: number;
  conversions: number;
  avg_latency_ms: number;
  task_completion_rate: number;
  fallback_rate: number;
}

export interface IExperiment extends Document {
  merchant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  name: string;
  hypothesis: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'TERMINATED';
  traffic_split: number; // e.g. 50 (50% to A, 50% to B)
  variant_a: IVariantMetric;
  variant_b: IVariantMetric;
  winner_variant?: 'A' | 'B' | 'INCONCLUSIVE';
  starts_at?: Date;
  ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const VariantMetricSchema = new Schema<IVariantMetric>(
  {
    prompt_version_id: { type: Schema.Types.ObjectId, ref: 'PromptVersion', required: true },
    version_number: { type: Number },
    sample_count: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    avg_latency_ms: { type: Number, default: 0 },
    task_completion_rate: { type: Number, default: 0 },
    fallback_rate: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExperimentSchema = new Schema<IExperiment>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    name: { type: String, required: true, trim: true },
    hypothesis: { type: String, default: '' },
    status: {
      type: String,
      enum: ['DRAFT', 'RUNNING', 'COMPLETED', 'TERMINATED'],
      default: 'DRAFT',
    },
    traffic_split: { type: Number, default: 50 },
    variant_a: { type: VariantMetricSchema, required: true },
    variant_b: { type: VariantMetricSchema, required: true },
    winner_variant: { type: String, enum: ['A', 'B', 'INCONCLUSIVE', null], default: null },
    starts_at: { type: Date },
    ends_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ExperimentSchema.index({ merchant_id: 1, agent_id: 1, status: 1 });

export const Experiment = mongoose.model<IExperiment>('Experiment', ExperimentSchema);
