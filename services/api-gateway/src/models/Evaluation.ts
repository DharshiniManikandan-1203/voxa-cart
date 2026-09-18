import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationScores {
  task_completion: number; // 0 - 100
  tool_call_accuracy: number; // 0 - 100
  response_length_compliance: number; // 0 - 100
  hallucination_penalty: number; // 0 - 100
  customer_sentiment_score: number; // -1 to 1
}

export interface IEvaluation extends Document {
  conversation_id: mongoose.Types.ObjectId;
  merchant_id: mongoose.Types.ObjectId;
  agent_id: mongoose.Types.ObjectId;
  prompt_version_id?: mongoose.Types.ObjectId;
  scores: IEvaluationScores;
  overall_score: number; // 0 - 100 weighted
  eval_breakdown: string[];
  evaluated_by: string;
  created_at: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    prompt_version_id: { type: Schema.Types.ObjectId, ref: 'PromptVersion' },
    scores: {
      task_completion: { type: Number, min: 0, max: 100, default: 0 },
      tool_call_accuracy: { type: Number, min: 0, max: 100, default: 0 },
      response_length_compliance: { type: Number, min: 0, max: 100, default: 0 },
      hallucination_penalty: { type: Number, min: 0, max: 100, default: 0 },
      customer_sentiment_score: { type: Number, min: -1, max: 1, default: 0 },
    },
    overall_score: { type: Number, min: 0, max: 100, default: 0 },
    eval_breakdown: { type: [String], default: [] },
    evaluated_by: { type: String, default: 'LLM_JUDGE_V1' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

EvaluationSchema.index({ merchant_id: 1, overall_score: 1 });
EvaluationSchema.index({ conversation_id: 1 });

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);
