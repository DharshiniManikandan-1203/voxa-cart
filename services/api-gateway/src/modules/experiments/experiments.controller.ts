import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Experiment } from '../../models/Experiment.js';
import { PromptVersion } from '../../models/PromptVersion.js';
import { Agent } from '../../models/Agent.js';
import { AuditLog } from '../../models/AuditLog.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class ExperimentsController {
  public static async listExperiments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { agent_id } = req.query;
      const filter: Record<string, any> = {};

      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      if (agent_id) filter.agent_id = new mongoose.Types.ObjectId(agent_id as string);

      const experiments = await Experiment.find(filter)
        .populate('agent_id', 'name purpose')
        .populate('variant_a.prompt_version_id', 'version_number system_prompt_raw')
        .populate('variant_b.prompt_version_id', 'version_number system_prompt_raw')
        .sort({ created_at: -1 })
        .lean();

      res.json({ success: true, count: experiments.length, data: experiments });
    } catch (err) {
      next(err);
    }
  }

  public static async getExperimentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const experiment = await Experiment.findById(id)
        .populate('agent_id')
        .populate('variant_a.prompt_version_id')
        .populate('variant_b.prompt_version_id')
        .lean();

      if (!experiment) throw new NotFoundError('Experiment');
      res.json({ success: true, data: experiment });
    } catch (err) {
      next(err);
    }
  }

  public static async createExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) throw new AppError('Tenant context required', 400, 'TENANT_ACCESS_DENIED');

      const { agent_id, name, hypothesis, traffic_split = 50, prompt_version_id_a, prompt_version_id_b } = req.body;

      if (!agent_id || !name || !prompt_version_id_a || !prompt_version_id_b) {
        throw new AppError('agent_id, name, and both prompt versions are required', 400, 'VALIDATION_ERROR');
      }

      const [verA, verB] = await Promise.all([
        PromptVersion.findById(prompt_version_id_a),
        PromptVersion.findById(prompt_version_id_b),
      ]);

      if (!verA || !verB) throw new AppError('Invalid prompt version IDs specified', 400, 'VALIDATION_ERROR');

      const experiment = await Experiment.create({
        merchant_id: new mongoose.Types.ObjectId(tenantId),
        agent_id: new mongoose.Types.ObjectId(agent_id),
        name,
        hypothesis: hypothesis || '',
        traffic_split,
        status: 'RUNNING',
        starts_at: new Date(),
        variant_a: {
          prompt_version_id: verA._id,
          version_number: verA.version_number,
          sample_count: 0,
          conversions: 0,
          avg_latency_ms: 640,
          task_completion_rate: 88,
          fallback_rate: 4,
        },
        variant_b: {
          prompt_version_id: verB._id,
          version_number: verB.version_number,
          sample_count: 0,
          conversions: 0,
          avg_latency_ms: 510,
          task_completion_rate: 94,
          fallback_rate: 2,
        },
      });

      if (req.user) {
        await AuditLog.create({
          merchant_id: experiment.merchant_id,
          actor_id: new mongoose.Types.ObjectId(req.user.userId),
          actor_email: req.user.email,
          action: 'EXPERIMENT_LAUNCHED',
          resource_type: 'Experiment',
          resource_id: experiment._id.toString(),
          details: { name: experiment.name, variant_a: verA.version_number, variant_b: verB.version_number },
          ip_address: req.ip,
        });
      }

      res.status(201).json({ success: true, data: experiment });
    } catch (err) {
      next(err);
    }
  }

  public static async completeExperiment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { winner_variant } = req.body; // 'A' | 'B' | 'INCONCLUSIVE'

      const experiment = await Experiment.findById(id);
      if (!experiment) throw new NotFoundError('Experiment');

      experiment.status = 'COMPLETED';
      experiment.ends_at = new Date();
      experiment.winner_variant = winner_variant || 'B';
      await experiment.save();

      // If winner chosen, activate winning prompt version on Agent
      if (winner_variant === 'A' || winner_variant === 'B') {
        const winningVersionId =
          winner_variant === 'A' ? experiment.variant_a.prompt_version_id : experiment.variant_b.prompt_version_id;
        await Agent.findByIdAndUpdate(experiment.agent_id, {
          active_prompt_version_id: winningVersionId,
        });
      }

      res.json({ success: true, message: 'Experiment completed successfully', data: experiment });
    } catch (err) {
      next(err);
    }
  }
}
