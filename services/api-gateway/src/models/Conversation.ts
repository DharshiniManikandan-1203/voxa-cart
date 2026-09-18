import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  merchant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  prompt_version_id?: mongoose.Types.ObjectId;
  experiment_id?: mongoose.Types.ObjectId;
  variant_tag?: 'A' | 'B';
  customer_phone?: string;
  customer_name?: string;
  channel: 'VOICE_WEB' | 'VOICE_PHONE' | 'TEXT_PLAYGROUND';
  current_state: string; // state node e.g. "INIT", "PRODUCT_SEARCH", "CART_CONFIRMATION"
  extracted_slots: Record<string, any>;
  language_detected: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'FALLBACK_TRIGGERED';
  duration_seconds: number;
  total_turns: number;
  created_at: Date;
  updated_at: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    prompt_version_id: { type: Schema.Types.ObjectId, ref: 'PromptVersion' },
    experiment_id: { type: Schema.Types.ObjectId, ref: 'Experiment', default: null },
    variant_tag: { type: String, enum: ['A', 'B'] },
    customer_phone: { type: String },
    customer_name: { type: String, default: 'Guest Shopper' },
    channel: {
      type: String,
      enum: ['VOICE_WEB', 'VOICE_PHONE', 'TEXT_PLAYGROUND'],
      default: 'VOICE_WEB',
    },
    current_state: { type: String, default: 'INIT' },
    extracted_slots: { type: Map, of: Schema.Types.Mixed, default: {} },
    language_detected: { type: String, default: 'hinglish' },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ABANDONED', 'FALLBACK_TRIGGERED'],
      default: 'ACTIVE',
    },
    duration_seconds: { type: Number, default: 0 },
    total_turns: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ConversationSchema.index({ merchant_id: 1, created_at: -1 });
ConversationSchema.index({ agent_id: 1, status: 1 });
ConversationSchema.index({ experiment_id: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
