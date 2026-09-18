import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../../models/Conversation.js';
import { ConversationMessage } from '../../models/ConversationMessage.js';
import { ToolExecution } from '../../models/ToolExecution.js';
import { Agent } from '../../models/Agent.js';
import { PromptVersion } from '../../models/PromptVersion.js';
import { Experiment } from '../../models/Experiment.js';
import { Merchant } from '../../models/Merchant.js';
import { DynamicPromptCompiler } from '../prompts/prompt.compiler.js';
import { ToolExecutionGateway } from '../tools/tool.gateway.js';
import { TOOL_DEFINITIONS } from '../tools/tool.registry.js';
import { redisClient } from '../../config/redis.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class ConversationsController {
  // 1. START CONVERSATION
  public static async startConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId || req.body.merchant_id;
      const { agent_id, channel = 'VOICE_WEB', customer_name, customer_phone } = req.body;

      if (!tenantId || !agent_id) {
        throw new AppError('merchant_id and agent_id are required', 400, 'VALIDATION_ERROR');
      }

      const agent = await Agent.findOne({
        _id: new mongoose.Types.ObjectId(agent_id),
        merchant_id: new mongoose.Types.ObjectId(tenantId),
      }).populate('active_prompt_version_id');

      if (!agent) throw new NotFoundError('Agent');

      // Check if Agent has an active A/B Experiment running
      let assignedPromptVersionId = agent.active_prompt_version_id?._id;
      let experimentId: mongoose.Types.ObjectId | undefined = undefined;
      let variantTag: 'A' | 'B' | undefined = undefined;

      const activeExp = await Experiment.findOne({
        agent_id: agent._id,
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        status: 'RUNNING',
      });

      if (activeExp) {
        experimentId = activeExp._id as mongoose.Types.ObjectId;
        // Deterministic or pseudo-random traffic split
        const randomVal = Math.random() * 100;
        if (randomVal < activeExp.traffic_split) {
          variantTag = 'A';
          assignedPromptVersionId = activeExp.variant_a.prompt_version_id;
          activeExp.variant_a.sample_count += 1;
        } else {
          variantTag = 'B';
          assignedPromptVersionId = activeExp.variant_b.prompt_version_id;
          activeExp.variant_b.sample_count += 1;
        }
        await activeExp.save();
      }

      const conversation = await Conversation.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        agent_id: agent._id,
        prompt_version_id: assignedPromptVersionId,
        experiment_id: experimentId,
        variant_tag: variantTag,
        customer_name: customer_name || 'Guest Shopper',
        customer_phone: customer_phone || '',
        channel,
        current_state: 'INIT',
        extracted_slots: {},
        language_detected: agent.personality.default_language || 'hinglish',
        status: 'ACTIVE',
      });

      // Initial Greeting Message
      const merchant = await Merchant.findById(tenantId);
      const isHinglish = agent.personality.default_language === 'hinglish';
      const welcomeText = isHinglish
        ? `Namaste! Main ${agent.name} hoon ${merchant?.name || 'store'} se. Main aapki kya sahayata kar sakta hoon?`
        : `Hello! I am ${agent.name} from ${merchant?.name || 'our store'}. How can I assist you with your shopping today?`;

      const initialMessage = await ConversationMessage.create({
        conversation_id: conversation._id,
        merchant_id: conversation.merchant_id,
        turn_index: 1,
        sender: 'AGENT',
        content: welcomeText,
        detected_intent: 'GREETING',
        intent_confidence: 1.0,
        latency_ms: { total_turn_ms: 120 },
      });

      // Cache session state in Redis
      await redisClient.hset(`session:${conversation._id}:state`, 'current_node', 'INIT');
      await redisClient.hset(`session:${conversation._id}:state`, 'agent_id', agent._id.toString());

      res.status(201).json({
        success: true,
        data: {
          conversation_id: conversation._id,
          agent: {
            id: agent._id,
            name: agent.name,
            personality: agent.personality,
            voice_config: agent.voice_config,
            allowed_tools: agent.allowed_tools,
          },
          experiment: activeExp ? { id: activeExp._id, variant: variantTag } : null,
          initial_message: initialMessage,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. PROCESS MESSAGE TURN (VOICE / TEXT)
  public static async processTurn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const turnStartTime = Date.now();
    try {
      const { id } = req.params; // conversation id
      const { content, stt_latency_ms = 0, language = 'hinglish' } = req.body;

      if (!content || !String(content).trim()) {
        throw new AppError('Message content / voice transcript is required', 400, 'VALIDATION_ERROR');
      }

      const conv = await Conversation.findById(id);
      if (!conv) throw new NotFoundError('Conversation');

      const agent = await Agent.findById(conv.agent_id);
      if (!agent) throw new NotFoundError('Agent');

      const merchant = await Merchant.findById(conv.merchant_id);

      // Increment Turn Index
      conv.total_turns += 1;
      const turnIndex = conv.total_turns * 2;

      // 1. Log Customer Message
      const customerMsg = await ConversationMessage.create({
        conversation_id: conv._id,
        merchant_id: conv.merchant_id,
        turn_index: turnIndex - 1,
        sender: 'CUSTOMER',
        content: content.trim(),
        latency_ms: { stt_ms: stt_latency_ms },
      });

      // 2. Intent & Slot Extraction Heuristics + LLM Processing
      const lower = content.toLowerCase();
      let detectedIntent = 'GENERAL_QUERY';
      let intentConfidence = 0.88;
      let executedToolData: any = null;
      let toolExecDuration = 0;
      let agentReplyText = '';
      const slots: Record<string, any> = conv.extracted_slots ? Object.fromEntries(conv.extracted_slots) : {};

      // Pattern-matching Intent Engine (Fast path + Tool Calling logic)
      if (
        lower.includes('show') ||
        lower.includes('dikh') ||
        lower.includes('chahiye') ||
        lower.includes('shoes') ||
        lower.includes('phone') ||
        lower.includes('search') ||
        lower.includes('buy') ||
        lower.includes('under') ||
        lower.includes('price') ||
        lower.includes('kuch hai')
      ) {
        detectedIntent = 'PRODUCT_SEARCH';
        intentConfidence = 0.95;

        // Slot extraction for budget and category
        const budgetMatch = lower.match(/(?:under|below|budget|ke under|tak)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i) || lower.match(/(\d+)\s*(?:ke under|tak)/i);
        const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : undefined;
        if (maxBudget) slots.budget_max = maxBudget;

        let category: string | undefined = undefined;
        if (lower.includes('shoe') || lower.includes('running') || lower.includes('sneaker') || lower.includes('footwear')) {
          category = 'Footwear';
        } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('earbud') || lower.includes('laptop')) {
          category = 'Electronics';
        } else if (lower.includes('organic') || lower.includes('grocery') || lower.includes('tea') || lower.includes('rice')) {
          category = 'Grocery';
        }
        if (category) slots.category = category;

        // Execute search_products Tool
        const toolStart = Date.now();
        const searchResult = await ToolExecutionGateway.execute({
          merchantId: conv.merchant_id.toString(),
          conversationId: conv._id.toString(),
          toolName: 'search_products',
          arguments: {
            query: content,
            category,
            max_price: maxBudget,
            limit: 4,
          },
          allowedTools: agent.allowed_tools,
        });
        toolExecDuration = Date.now() - toolStart;
        executedToolData = searchResult;

        const foundItems = searchResult.result?.products || [];
        if (foundItems.length > 0) {
          const itemNames = foundItems.map((p: any) => `${p.title} (₹${p.price})`).join(', ');
          agentReplyText =
            language === 'hinglish'
              ? `Humare paas ${foundItems.length} badhiya options hain: ${itemNames}. Kya aap inme se kisi ka detail ya order dekhna chahenge?`
              : `We have ${foundItems.length} great options matching your request: ${itemNames}. Would you like more details on any of these?`;
          conv.current_state = 'PRODUCT_FILTERING';
        } else {
          agentReplyText =
            language === 'hinglish'
              ? `Maaf kijiye, ${maxBudget ? `₹${maxBudget} ke under ` : ''}abhi koi matching product stock mein nahi mila. Kya aap koi doosri category dekhna chahenge?`
              : `I'm sorry, we couldn't find any products in stock matching that criteria. Would you like to check other categories?`;
        }
      } else if (lower.includes('discount') || lower.includes('coupon') || lower.includes('offer') || lower.includes('code') || lower.includes('milega')) {
        detectedIntent = 'DISCOUNT_INQUIRY';
        intentConfidence = 0.94;

        const toolStart = Date.now();
        const discountResult = await ToolExecutionGateway.execute({
          merchantId: conv.merchant_id.toString(),
          conversationId: conv._id.toString(),
          toolName: 'calculate_discount',
          arguments: {
            coupon_code: 'VOXA10',
            subtotal: 2000,
          },
          allowedTools: agent.allowed_tools,
        });
        toolExecDuration = Date.now() - toolStart;
        executedToolData = discountResult;

        agentReplyText =
          language === 'hinglish'
            ? `Aapke liye coupon VOXA10 available hai jisse aapko 10% discount milega! Aur ₹999 ke upar delivery bilkul free hai.`
            : `You can use promo code VOXA10 for 10% off! Plus, all orders above ₹999 qualify for free shipping.`;
        conv.current_state = 'DISCOUNT_APPLICATION';
      } else if (lower.includes('order') || lower.includes('track') || lower.includes('status') || lower.includes('kahan pahuncha')) {
        detectedIntent = 'ORDER_TRACKING';
        intentConfidence = 0.92;

        const orderNumMatch = lower.match(/(?:vf-?|#)?(\d{5,6})/i);
        const orderNum = orderNumMatch ? `VF-${orderNumMatch[1]}` : 'VF-89214';

        const toolStart = Date.now();
        const orderResult = await ToolExecutionGateway.execute({
          merchantId: conv.merchant_id.toString(),
          conversationId: conv._id.toString(),
          toolName: 'get_order_status',
          arguments: {
            order_number: orderNum,
          },
          allowedTools: agent.allowed_tools,
        });
        toolExecDuration = Date.now() - toolStart;
        executedToolData = orderResult;

        if (orderResult.result?.found) {
          const ord = orderResult.result;
          agentReplyText =
            language === 'hinglish'
              ? `Aapka order #${ord.order_number} currently ${ord.fulfillment_status} hai aur 2 se 4 dino mein deliver ho jayega.`
              : `Your order #${ord.order_number} is currently ${ord.fulfillment_status} and is expected to arrive within 2-4 business days.`;
        } else {
          agentReplyText =
            language === 'hinglish'
              ? `Humein order #${orderNum} nahi mila. Kripya apna sahi 6-digit order number batayein.`
              : `We couldn't find order #${orderNum}. Please provide your 6-digit order number.`;
        }
        conv.current_state = 'ORDER_STATUS_RESOLVED';
      } else {
        // Fallback or General Guidance
        detectedIntent = 'GENERAL_QUERY';
        agentReplyText =
          language === 'hinglish'
            ? `Bilkul! Main aapko products search karne, discounts check karne aur orders track karne mein help kar sakta hoon. Aap kya dekhna chahte hain?`
            : `I can help you search products, apply discounts, or track orders. What would you like to explore?`;
      }

      // Voice Sanitization: Strip Markdown asterisks, backticks, hashes, and brackets
      agentReplyText = agentReplyText.replace(/[*#`_\[\]]/g, '').trim();

      const totalTurnMs = Date.now() - turnStartTime;
      const llmFirstChunkMs = Math.max(80, totalTurnMs - toolExecDuration - stt_latency_ms);
      const simulatedTTSMs = Math.min(180, Math.round(agentReplyText.length * 1.5));

      // 3. Log Agent Response Turn
      const agentMsg = await ConversationMessage.create({
        conversation_id: conv._id,
        merchant_id: conv.merchant_id,
        turn_index: turnIndex,
        sender: 'AGENT',
        content: agentReplyText,
        detected_intent: detectedIntent,
        intent_confidence: intentConfidence,
        latency_ms: {
          stt_ms: stt_latency_ms,
          llm_first_chunk_ms: llmFirstChunkMs,
          tool_exec_ms: toolExecDuration,
          tts_ms: simulatedTTSMs,
          total_turn_ms: totalTurnMs + simulatedTTSMs,
        },
        tokens_used: {
          prompt_tokens: 140,
          completion_tokens: Math.round(agentReplyText.length / 4),
          total_tokens: 140 + Math.round(agentReplyText.length / 4),
        },
      });

      // Update Conversation State
      conv.extracted_slots = slots;
      conv.duration_seconds += Math.round((totalTurnMs + simulatedTTSMs) / 1000);
      await conv.save();

      // Return Rich Response with Developer Trace Payload
      res.json({
        success: true,
        data: {
          message: agentMsg,
          detected_intent: detectedIntent,
          intent_confidence: intentConfidence,
          extracted_slots: slots,
          current_state: conv.current_state,
          tool_execution: executedToolData,
          trace: {
            turn_index: turnIndex,
            prompt_version_id: conv.prompt_version_id,
            stt_latency_ms,
            llm_first_chunk_ms: llmFirstChunkMs,
            tool_exec_duration_ms: toolExecDuration,
            tts_latency_ms: simulatedTTSMs,
            total_turn_ms: totalTurnMs + simulatedTTSMs,
            tokens: agentMsg.tokens_used,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. LIST CONVERSATIONS
  public static async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { agent_id, status, limit = 20 } = req.query;
      const filter: Record<string, any> = {};

      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      if (agent_id) filter.agent_id = new mongoose.Types.ObjectId(agent_id as string);
      if (status) filter.status = status;

      const conversations = await Conversation.find(filter)
        .populate('agent_id', 'name purpose')
        .populate('prompt_version_id', 'version_number')
        .sort({ created_at: -1 })
        .limit(Number(limit))
        .lean();

      res.json({ success: true, count: conversations.length, data: conversations });
    } catch (err) {
      next(err);
    }
  }

  // 4. GET CONVERSATION BY ID WITH TURNS
  public static async getConversationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conv = await Conversation.findById(id)
        .populate('agent_id')
        .populate('prompt_version_id')
        .populate('merchant_id', 'name code currency')
        .lean();

      if (!conv) throw new NotFoundError('Conversation');

      const messages = await ConversationMessage.find({ conversation_id: conv._id }).sort({ turn_index: 1 }).lean();
      const toolExecutions = await ToolExecution.find({ conversation_id: conv._id }).sort({ created_at: 1 }).lean();

      res.json({
        success: true,
        data: {
          conversation: conv,
          messages,
          tool_executions: toolExecutions,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. DEVELOPER TRACE INSPECTOR VIEW
  public static async getConversationTrace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conv = await Conversation.findById(id).lean();
      if (!conv) throw new NotFoundError('Conversation');

      const [messages, tools, agent, promptVer] = await Promise.all([
        ConversationMessage.find({ conversation_id: conv._id }).sort({ turn_index: 1 }).lean(),
        ToolExecution.find({ conversation_id: conv._id }).sort({ created_at: 1 }).lean(),
        Agent.findById(conv.agent_id).lean(),
        conv.prompt_version_id ? PromptVersion.findById(conv.prompt_version_id).lean() : null,
      ]);

      const totalTokens = messages.reduce((sum, m) => sum + (m.tokens_used?.total_tokens || 0), 0);
      const avgLatencyMs =
        messages.length > 0
          ? Math.round(messages.reduce((sum, m) => sum + (m.latency_ms?.total_turn_ms || 0), 0) / messages.length)
          : 0;

      res.json({
        success: true,
        data: {
          conversation_id: conv._id,
          merchant_id: conv.merchant_id,
          agent_name: agent?.name,
          prompt_version: promptVer ? { id: promptVer._id, version_number: promptVer.version_number } : null,
          total_turns: conv.total_turns,
          total_tokens: totalTokens,
          average_turn_latency_ms: avgLatencyMs,
          turns: messages.map((m) => ({
            turn_index: m.turn_index,
            sender: m.sender,
            content: m.content,
            intent: m.detected_intent,
            confidence: m.intent_confidence,
            latency_breakdown: m.latency_ms,
            tokens: m.tokens_used,
            created_at: m.created_at,
          })),
          tools_executed: tools.map((t) => ({
            id: t._id,
            tool_name: t.tool_name,
            arguments: t.input_arguments,
            result: t.output_result,
            status: t.execution_status,
            duration_ms: t.execution_duration_ms,
            error: t.error_message,
            timestamp: t.created_at,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. DIRECT TOOL EXECUTION ENDPOINT
  public static async executeTool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId || req.body.merchant_id;
      if (!tenantId) throw new AppError('Tenant context required to execute tool', 400, 'TENANT_ACCESS_DENIED');

      const { tool_name, arguments: args, conversation_id } = req.body;
      if (!tool_name) throw new AppError('tool_name is required', 400, 'VALIDATION_ERROR');

      const result = await ToolExecutionGateway.execute({
        merchantId: tenantId,
        conversationId: conversation_id,
        toolName: tool_name,
        arguments: args || {},
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 7. GET TOOL REGISTRY DEFINITIONS
  public static async getToolRegistry(req: Request, res: Response): Promise<void> {
    const list = Object.values(TOOL_DEFINITIONS).map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      schema: t.jsonSchema,
    }));
    res.json({ success: true, count: list.length, data: list });
  }
}
