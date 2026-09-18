import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Agent } from '../../models/Agent.js';
import { PromptTemplate } from '../../models/PromptTemplate.js';
import { PromptVersion } from '../../models/PromptVersion.js';
import { AuditLog } from '../../models/AuditLog.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class AgentsController {
  public static async listAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const query: Record<string, any> = tenantId ? { merchant_id: new mongoose.Types.ObjectId(tenantId) } : {};

      const agents = await Agent.find(query)
        .populate('active_prompt_version_id')
        .sort({ created_at: -1 })
        .lean();

      res.json({ success: true, count: agents.length, data: agents });
    } catch (err) {
      next(err);
    }
  }

  public static async getAgentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const agent = await Agent.findOne(query).populate('active_prompt_version_id').lean();
      if (!agent) {
        throw new NotFoundError('Agent');
      }

      // Fetch linked prompt templates
      const templates = await PromptTemplate.find({ agent_id: agent._id }).lean();

      res.json({ success: true, data: { ...agent, templates } });
    } catch (err) {
      next(err);
    }
  }

  public static async createAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant context required to create agent', 400, 'TENANT_ACCESS_DENIED');
      }

      const {
        name,
        purpose,
        personality,
        voice_config,
        stt_config,
        allowed_tools,
        business_rules,
        max_response_sentences,
        fallback_behavior,
        initial_system_prompt,
      } = req.body;

      if (!name) {
        throw new AppError('Agent name is required', 400, 'VALIDATION_ERROR');
      }

      // 1. Create Agent
      const agent = await Agent.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        name,
        purpose: purpose || 'SALES',
        personality: personality || {
          tone: 'friendly',
          style: 'Concise, helpful voice shopping assistant',
          default_language: 'hinglish',
        },
        voice_config: voice_config || {
          provider: 'BROWSER_TTS',
          voice_id: 'en-IN-Standard-A',
          speed: 1.0,
          pitch: 1.0,
        },
        stt_config: stt_config || {
          provider: 'BROWSER_STT',
          language_code: 'en-IN',
        },
        allowed_tools: allowed_tools || [
          'search_products',
          'get_product_details',
          'calculate_discount',
          'calculate_final_price',
          'get_order_status',
        ],
        business_rules: business_rules || [
          'Free delivery on orders above ₹999',
          'Offer coupon VOXA10 on inquiries for discounts',
        ],
        max_response_sentences: max_response_sentences || 2,
        fallback_behavior: fallback_behavior || {
          max_retries: 2,
          fallback_message:
            'Maaf kijiye, main theek se samajh nahi paya. Main aapko customer support executive se connect kar raha hoon.',
          escalation_action: 'HANDOFF_AGENT',
        },
        status: 'ACTIVE',
      });

      // 2. Automatically provision Default Prompt Template & Version v1
      const rawPrompt =
        initial_system_prompt ||
        `You are a conversational voice commerce assistant for {{merchant_name}} (Industry: {{industry}}).
Language: Speak natural {{language}}.
Maximum response length: {{max_sentences}} short sentences.
Business Rules: {{business_rules}}
Available context: {{catalog_context}}
Discounts: {{active_discounts}}

CRITICAL VOICE RULES:
1. Keep replies strictly under {{max_sentences}} sentences.
2. NEVER use markdown symbols (*, #, bullet points) or long paragraphs because this will be spoken aloud.
3. NEVER do math yourself. Call calculate_discount or calculate_final_price for prices and discounts.
4. When customer speaks Hinglish, respond naturally in Hinglish.`;

      const template = await PromptTemplate.create({
        merchant_id: agent.merchant_id,
        agent_id: agent._id,
        name: `${agent.name} Main Persona`,
        description: 'Standard prompt template with dynamic variable injection',
        latest_version_number: 1,
      });

      const versionV1 = await PromptVersion.create({
        template_id: template._id,
        merchant_id: agent.merchant_id,
        version_number: 1,
        system_prompt_raw: rawPrompt,
        variables: [
          { name: 'merchant_name', description: 'Store name', required: true },
          { name: 'industry', description: 'Industry vertical', required: false, default_value: 'Retail' },
          { name: 'language', description: 'Dialogue language', required: false, default_value: 'Hinglish' },
          { name: 'max_sentences', description: 'Max sentences per turn', required: false, default_value: '2' },
          { name: 'business_rules', description: 'Store policies', required: false },
          { name: 'catalog_context', description: 'Product info', required: false },
          { name: 'active_discounts', description: 'Current coupons', required: false },
        ],
        status: 'ACTIVE',
        change_description: 'Initial provisioned prompt template',
        author_id: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      });

      template.active_version_id = versionV1._id;
      await template.save();

      agent.active_prompt_version_id = versionV1._id;
      await agent.save();

      if (req.user) {
        await AuditLog.create({
          merchant_id: agent.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'AGENT_CREATED',
          resource_type: 'Agent',
          resource_id: agent._id.toString(),
          details: { name: agent.name, purpose: agent.purpose },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: agent });
    } catch (err) {
      next(err);
    }
  }

  public static async updateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const updated = await Agent.findOneAndUpdate(query, { $set: req.body }, { new: true, runValidators: true });
      if (!updated) {
        throw new NotFoundError('Agent');
      }

      if (req.user) {
        await AuditLog.create({
          merchant_id: updated.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'AGENT_UPDATED',
          resource_type: 'Agent',
          resource_id: updated._id.toString(),
          details: req.body,
          ip_address: req.ip,
        });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const agent = await Agent.findOne(query);
      if (!agent) {
        throw new NotFoundError('Agent');
      }

      agent.status = 'PAUSED';
      await agent.save();

      res.json({ success: true, message: 'Agent paused / archived successfully' });
    } catch (err) {
      next(err);
    }
  }
}
