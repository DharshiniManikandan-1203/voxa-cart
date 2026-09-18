import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationMessage extends Document {
  conversation_id: mongoose.Types.ObjectId;
  merchant_id: mongoose.Types.ObjectId;
  turn_index: number;
  sender: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | 'TOOL';
  content: string;
  audio_url?: string;
  detected_intent?: string;
  intent_confidence?: number;
  latency_ms: {
    stt_ms?: number;
    llm_first_chunk_ms?: number;
    tool_exec_ms?: number;
    tts_ms?: number;
    total_turn_ms?: number;
  };
  tokens_used?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created_at: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    turn_index: { type: Number, required: true },
    sender: {
      type: String,
      enum: ['CUSTOMER', 'AGENT', 'SYSTEM', 'TOOL'],
      required: true,
    },
    content: { type: String, required: true },
    audio_url: { type: String },
    detected_intent: { type: String },
    intent_confidence: { type: Number },
    latency_ms: {
      stt_ms: { type: Number, default: 0 },
      llm_first_chunk_ms: { type: Number, default: 0 },
      tool_exec_ms: { type: Number, default: 0 },
      tts_ms: { type: Number, default: 0 },
      total_turn_ms: { type: Number, default: 0 },
    },
    tokens_used: {
      prompt_tokens: { type: Number, default: 0 },
      completion_tokens: { type: Number, default: 0 },
      total_tokens: { type: Number, default: 0 },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

ConversationMessageSchema.index({ conversation_id: 1, turn_index: 1 });
ConversationMessageSchema.index({ merchant_id: 1, created_at: -1 });

export const ConversationMessage = mongoose.model<IConversationMessage>('ConversationMessage', ConversationMessageSchema);
