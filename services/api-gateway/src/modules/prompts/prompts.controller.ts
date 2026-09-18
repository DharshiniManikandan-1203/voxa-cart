import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PromptTemplate } from '../../models/PromptTemplate.js';
import { PromptVersion } from '../../models/PromptVersion.js';
import { Agent } from '../../models/Agent.js';
import { Merchant } from '../../models/Merchant.js';
import { AuditLog } from '../../models/AuditLog.js';
import { DynamicPromptCompiler } from './prompt.compiler.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class PromptsController {
  public static async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { agent_id } = req.query;
      const query: Record<string, any> = {};

      if (tenantId) query.merchant_id = new mongoose.Types.ObjectId(tenantId);
      if (agent_id) query.agent_id = new mongoose.Types.ObjectId(agent_id as string);

      const templates = await PromptTemplate.find(query)
        .populate('agent_id', 'name purpose personality')
        .populate('active_version_id')
        .sort({ created_at: -1 })
        .lean();

      res.json({ success: true, count: templates.length, data: templates });
    } catch (err) {
      next(err);
    }
  }

  public static async getTemplateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) };
      if (req.tenantId) query.merchant_id = new mongoose.Types.ObjectId(req.tenantId);

      const template = await PromptTemplate.findOne(query)
        .populate('agent_id')
        .populate('active_version_id')
        .lean();

      if (!template) {
        throw new NotFoundError('PromptTemplate');
      }

      // Fetch all immutable versions
      const versions = await PromptVersion.find({ template_id: template._id })
        .populate('author_id', 'name email')
        .sort({ version_number: -1 })
        .lean();

      res.json({ success: true, data: { ...template, versions } });
    } catch (err) {
      next(err);
    }
  }

  public static async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const { agent_id, name, description, system_prompt_raw, variables } = req.body;
      if (!agent_id || !name || !system_prompt_raw) {
        throw new AppError('agent_id, name, and system_prompt_raw are required', 400, 'VALIDATION_ERROR');
      }

      const agent = await Agent.findOne({
        _id: new mongoose.Types.ObjectId(agent_id),
        merchant_id: new mongoose.Types.ObjectId(tenantId),
      });
      if (!agent) throw new NotFoundError('Agent');

      const template = await PromptTemplate.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        agent_id: agent._id,
        name,
        description,
        latest_version_number: 1,
      });

      const versionV1 = await PromptVersion.create({
        template_id: template._id,
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        version_number: 1,
        system_prompt_raw,
        variables: variables || [],
        status: 'ACTIVE',
        change_description: 'Initial template creation',
        author_id: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      });

      template.active_version_id = versionV1._id;
      await template.save();

      res.status(201).json({ success: true, data: { template, active_version: versionV1 } });
    } catch (err) {
      next(err);
    }
  }

  public static async commitNewVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // template id
      const tenantId = req.tenantId;
      const { system_prompt_raw, variables, change_description, make_active } = req.body;

      if (!system_prompt_raw) {
        throw new AppError('system_prompt_raw is required for new version', 400, 'VALIDATION_ERROR');
      }

      const template = await PromptTemplate.findOne({
        _id: new mongoose.Types.ObjectId(id),
        merchant_id: new mongoose.Types.ObjectId(tenantId),
      });
      if (!template) throw new NotFoundError('PromptTemplate');

      const nextVersionNumber = template.latest_version_number + 1;

      const newVersion = await PromptVersion.create({
        template_id: template._id,
        merchant_id: template.merchant_id,
        version_number: nextVersionNumber,
        system_prompt_raw,
        variables: variables || [],
        status: make_active ? 'ACTIVE' : 'DRAFT',
        change_description: change_description || `Incremental update to version ${nextVersionNumber}`,
        author_id: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      });

      template.latest_version_number = nextVersionNumber;

      if (make_active) {
        // Mark previous active versions as ARCHIVED
        await PromptVersion.updateMany(
          { template_id: template._id, _id: { $ne: newVersion._id }, status: 'ACTIVE' },
          { $set: { status: 'ARCHIVED' } }
        );

        template.active_version_id = newVersion._id;

        // Also update agent's active prompt version
        await Agent.findByIdAndUpdate(template.agent_id, {
          active_prompt_version_id: newVersion._id,
        });
      }

      await template.save();

      if (req.user) {
        await AuditLog.create({
          merchant_id: template.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'PROMPT_VERSION_COMMITTED',
          resource_type: 'PromptVersion',
          resource_id: newVersion._id.toString(),
          details: {
            template_id: template._id,
            version_number: nextVersionNumber,
            make_active: Boolean(make_active),
            change_description,
          },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: newVersion });
    } catch (err) {
      next(err);
    }
  }

  public static async activateVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, versionId } = req.params;
      const tenantId = req.tenantId;

      const template = await PromptTemplate.findOne({
        _id: new mongoose.Types.ObjectId(id),
        merchant_id: new mongoose.Types.ObjectId(tenantId),
      });
      if (!template) throw new NotFoundError('PromptTemplate');

      const version = await PromptVersion.findOne({
        _id: new mongoose.Types.ObjectId(versionId),
        template_id: template._id,
      });
      if (!version) throw new NotFoundError('PromptVersion');

      // Archive other active versions for this template
      await PromptVersion.updateMany(
        { template_id: template._id, _id: { $ne: version._id }, status: 'ACTIVE' },
        { $set: { status: 'ARCHIVED' } }
      );

      version.status = 'ACTIVE';
      await version.save();

      template.active_version_id = version._id;
      await template.save();

      await Agent.findByIdAndUpdate(template.agent_id, {
        active_prompt_version_id: version._id,
      });

      if (req.user) {
        await AuditLog.create({
          merchant_id: template.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'PROMPT_VERSION_ACTIVATED',
          resource_type: 'PromptVersion',
          resource_id: version._id.toString(),
          details: { version_number: version.version_number, template_id: template._id },
          ip_address: req.ip,
        });
      }

      res.json({ success: true, message: `Version ${version.version_number} is now active for live traffic`, data: version });
    } catch (err) {
      next(err);
    }
  }

  public static async compilePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { system_prompt_raw, variables, context } = req.body;
      if (!system_prompt_raw) {
        throw new AppError('system_prompt_raw is required', 400, 'VALIDATION_ERROR');
      }

      const result = DynamicPromptCompiler.compile(system_prompt_raw, variables || [], context || {});
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
