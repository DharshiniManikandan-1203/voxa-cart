import mongoose, { Schema, Document } from 'mongoose';

export interface IToolExecution extends Document {
  conversation_id: mongoose.Types.ObjectId;
  merchant_id: mongoose.Types.ObjectId;
  turn_index?: number;
  tool_name: string;
  input_arguments: Record<string, any>;
  output_result: Record<string, any>;
  execution_status: 'SUCCESS' | 'FAILED' | 'VALIDATION_ERROR';
  error_message?: string;
  execution_duration_ms: number;
  created_at: Date;
}

const ToolExecutionSchema = new Schema<IToolExecution>(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    merchant_id: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    turn_index: { type: Number },
    tool_name: { type: String, required: true },
    input_arguments: { type: Schema.Types.Mixed, default: {} },
    output_result: { type: Schema.Types.Mixed, default: {} },
    execution_status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'VALIDATION_ERROR'],
      required: true,
    },
    error_message: { type: String },
    execution_duration_ms: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

ToolExecutionSchema.index({ merchant_id: 1, tool_name: 1 });
ToolExecutionSchema.index({ conversation_id: 1, created_at: 1 });

export const ToolExecution = mongoose.model<IToolExecution>('ToolExecution', ToolExecutionSchema);
