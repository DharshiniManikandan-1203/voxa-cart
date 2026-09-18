import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  merchant_id: mongoose.Types.ObjectId;
  name: string;
  purpose: 'SALES' | 'SUPPORT' | 'ORDER_TRACKING' | 'RETURNS' | 'GENERAL';
  personality: {
    tone: 'friendly' | 'professional' | 'enthusiastic' | 'direct';
    style: string;
    default_language: string;
  };
  active_prompt_version_id?: mongoose.Types.ObjectId;
  voice_config: {
    provider: 'BROWSER_TTS' | 'ELEVENLABS' | 'MOCK_VOICE';
    voice_id: string;
    speed: number;
    pitch: number;
  };
  stt_config: {
    provider: 'BROWSER_STT' | 'DEEPGRAM' | 'WHISPER_MOCK';
    language_code: string;
  };
  allowed_tools: string[];
  business_rules: string[];
  max_response_sentences: number;
  fallback_behavior: {
    max_retries: number;
    fallback_message: string;
    escalation_action: 'HANDOFF_AGENT' | 'SEND_SMS_LINK' | 'COLLECT_CALLBACK';
  };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  created_at: Date;
  updated_at: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    purpose: {
      type: String,
      enum: ['SALES', 'SUPPORT', 'ORDER_TRACKING', 'RETURNS', 'GENERAL'],
      default: 'SALES',
    },
    personality: {
      tone: {
        type: String,
        enum: ['friendly', 'professional', 'enthusiastic', 'direct'],
        default: 'friendly',
      },
      style: { type: String, default: 'Helpful and concise voice commerce assistant' },
      default_language: { type: String, default: 'hinglish' },
    },
    active_prompt_version_id: { type: Schema.Types.ObjectId, ref: 'PromptVersion' },
    voice_config: {
      provider: {
        type: String,
        enum: ['BROWSER_TTS', 'ELEVENLABS', 'MOCK_VOICE'],
        default: 'BROWSER_TTS',
      },
      voice_id: { type: String, default: 'en-IN-Standard-A' },
      speed: { type: Number, default: 1.0 },
      pitch: { type: Number, default: 1.0 },
    },
    stt_config: {
      provider: {
        type: String,
        enum: ['BROWSER_STT', 'DEEPGRAM', 'WHISPER_MOCK'],
        default: 'BROWSER_STT',
      },
      language_code: { type: String, default: 'en-IN' },
    },
    allowed_tools: {
      type: [String],
      default: ['search_products', 'get_product_details', 'calculate_discount', 'get_order_status'],
    },
    business_rules: { type: [String], default: [] },
    max_response_sentences: { type: Number, default: 2 },
    fallback_behavior: {
      max_retries: { type: Number, default: 2 },
      fallback_message: {
        type: String,
        default: 'Maaf kijiye, main theek se samajh nahi paya. Main aapko hamare executive se connect kar raha hoon.',
      },
      escalation_action: {
        type: String,
        enum: ['HANDOFF_AGENT', 'SEND_SMS_LINK', 'COLLECT_CALLBACK'],
        default: 'HANDOFF_AGENT',
      },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

AgentSchema.index({ merchant_id: 1, status: 1 });
AgentSchema.index({ merchant_id: 1, name: 1 });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
