import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Evaluation } from '../../models/Evaluation.js';
import { ConversationEvaluatorService } from './evaluator.service.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class EvaluationsController {
  public static async listEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { agent_id } = req.query;
      const filter: Record<string, any> = {};

      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);
      if (agent_id) filter.agent_id = new mongoose.Types.ObjectId(agent_id as string);

      const evaluations = await Evaluation.find(filter)
        .populate('conversation_id')
        .populate('agent_id', 'name purpose')
        .populate('prompt_version_id', 'version_number')
        .sort({ created_at: -1 })
        .lean();

      res.json({ success: true, count: evaluations.length, data: evaluations });
    } catch (err) {
      next(err);
    }
  }

  public static async runEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversation_id } = req.body;
      if (!conversation_id) {
        throw new AppError('conversation_id is required to run evaluation', 400, 'VALIDATION_ERROR');
      }

      const evaluation = await ConversationEvaluatorService.evaluateConversation(conversation_id);
      res.status(201).json({ success: true, data: evaluation });
    } catch (err) {
      next(err);
    }
  }
}
