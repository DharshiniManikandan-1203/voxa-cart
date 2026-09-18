import mongoose from 'mongoose';
import { Conversation } from '../../models/Conversation.js';
import { ConversationMessage } from '../../models/ConversationMessage.js';
import { ToolExecution } from '../../models/ToolExecution.js';
import { Evaluation, IEvaluationScores } from '../../models/Evaluation.js';
import { Agent } from '../../models/Agent.js';

export class ConversationEvaluatorService {
  /**
   * Evaluates a completed or active conversation against standard quality benchmarks.
   */
  public static async evaluateConversation(conversationId: string): Promise<any> {
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const messages = await ConversationMessage.find({ conversation_id: conv._id }).sort({ turn_index: 1 });
    const toolExecutions = await ToolExecution.find({ conversation_id: conv._id });
    const agent = await Agent.findById(conv.agent_id);

    const maxSentencesAllowed = agent?.max_response_sentences || 3;

    // 1. Tool Call Accuracy Score (0 - 100)
    let toolAccuracy = 100;
    if (toolExecutions.length > 0) {
      const successfulTools = toolExecutions.filter((t) => t.execution_status === 'SUCCESS').length;
      toolAccuracy = Math.round((successfulTools / toolExecutions.length) * 100);
    }

    // 2. Response Length Compliance Score (0 - 100)
    const agentMessages = messages.filter((m) => m.sender === 'AGENT');
    let lengthCompliantCount = 0;
    for (const msg of agentMessages) {
      const sentenceCount = (msg.content.match(/[.!?]+/g) || []).length || 1;
      if (sentenceCount <= maxSentencesAllowed + 1) {
        lengthCompliantCount++;
      }
    }
    const lengthCompliance = agentMessages.length > 0 ? Math.round((lengthCompliantCount / agentMessages.length) * 100) : 100;

    // 3. Task Completion Score (0 - 100)
    let taskCompletion = 70; // baseline
    if (conv.status === 'COMPLETED') {
      taskCompletion = 95;
    } else if (conv.status === 'FALLBACK_TRIGGERED') {
      taskCompletion = 40;
    } else if (conv.status === 'ABANDONED') {
      taskCompletion = 30;
    }

    // If order was created or product was found, reward completion
    const hasSuccessfulOrder = toolExecutions.some((t) => t.tool_name === 'create_order' && t.execution_status === 'SUCCESS');
    if (hasSuccessfulOrder) {
      taskCompletion = 100;
    }

    // 4. Hallucination Penalty (0 = no hallucination, 100 = severe hallucination)
    // Checks if agent claimed product prices that mismatch tool results
    let hallucinationPenalty = 0;
    const failedTools = toolExecutions.filter((t) => t.execution_status === 'FAILED');
    if (failedTools.length > 0) {
      hallucinationPenalty += 15 * failedTools.length;
    }
    hallucinationPenalty = Math.min(100, hallucinationPenalty);

    // 5. Customer Sentiment Score (-1 to 1)
    let sentimentScore = 0.5; // default positive-neutral
    const customerMessages = messages.filter((m) => m.sender === 'CUSTOMER');
    const negativeKeywords = ['bad', 'bekaar', 'galat', 'slow', 'hate', 'cancel', 'fraud', 'useless', 'not working'];
    const positiveKeywords = ['thank', 'shukriya', 'great', 'awesome', 'badhiya', 'perfect', 'order', 'good', 'sahi'];

    let posHits = 0;
    let negHits = 0;
    for (const cm of customerMessages) {
      const lower = cm.content.toLowerCase();
      if (positiveKeywords.some((k) => lower.includes(k))) posHits++;
      if (negativeKeywords.some((k) => lower.includes(k))) negHits++;
    }

    if (posHits > 0 || negHits > 0) {
      sentimentScore = Math.max(-1, Math.min(1, (posHits - negHits) / Math.max(1, posHits + negHits)));
    }

    const scores: IEvaluationScores = {
      task_completion: taskCompletion,
      tool_call_accuracy: toolAccuracy,
      response_length_compliance: lengthCompliance,
      hallucination_penalty: hallucinationPenalty,
      customer_sentiment_score: Math.round(sentimentScore * 100) / 100,
    };

    // Overall weighted composite:
    // 35% Task Completion + 25% Tool Accuracy + 20% Length Compliance + 10% Sentiment - 10% Hallucination Penalty
    const sentimentNormalized = (sentimentScore + 1) * 50; // maps -1..1 to 0..100
    const weightedScore = Math.round(
      scores.task_completion * 0.35 +
        scores.tool_call_accuracy * 0.25 +
        scores.response_length_compliance * 0.2 +
        sentimentNormalized * 0.1 -
        scores.hallucination_penalty * 0.1
    );

    const overallScore = Math.max(0, Math.min(100, weightedScore));

    const breakdown = [
      `Task Completion: ${scores.task_completion}% (Status: ${conv.status})`,
      `Tool Execution Accuracy: ${scores.tool_call_accuracy}% (${toolExecutions.length} tools executed)`,
      `Voice Response Conciseness: ${scores.response_length_compliance}% compliant with ${maxSentencesAllowed} sentence limit`,
      `Hallucination Risk: ${scores.hallucination_penalty}% penalty applied`,
      `Customer Sentiment Index: ${scores.customer_sentiment_score} on scale (-1 to +1)`,
    ];

    // Store evaluation
    const evaluation = await Evaluation.findOneAndUpdate(
      { conversation_id: conv._id },
      {
        conversation_id: conv._id,
        merchant_id: conv.merchant_id,
        agent_id: conv.agent_id,
        prompt_version_id: conv.prompt_version_id,
        scores,
        overall_score: overallScore,
        eval_breakdown: breakdown,
        evaluated_by: 'VOXAFLOW_EVAL_BENCHMARK_V1',
      },
      { upsert: true, new: true }
    );

    return evaluation;
  }
}
