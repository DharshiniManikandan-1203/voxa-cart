import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { NotFoundError, AppError } from '../../errors/AppError.js';

export class UsersController {
  public static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const filter: Record<string, any> = {};
      if (tenantId) filter.merchant_id = new mongoose.Types.ObjectId(tenantId);

      const users = await User.find(filter)
        .populate('role_id', 'name permissions is_system')
        .select('-password_hash')
        .sort({ created_at: -1 })
        .lean();

      res.json({ success: true, count: users.length, data: users });
    } catch (err) {
      next(err);
    }
  }

  public static async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await Role.find().lean();
      res.json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  }

  public static async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { name, email, password, role_name } = req.body;

      if (!name || !email || !password) {
        throw new AppError('Name, email, and temporary password are required', 400, 'VALIDATION_ERROR');
      }

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw new AppError('User with this email already exists', 409, 'VALIDATION_ERROR');
      }

      const role = await Role.findOne({ name: role_name || 'MERCHANT_MANAGER' });
      if (!role) throw new AppError(`Role '${role_name}' not found`, 400, 'VALIDATION_ERROR');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        merchant_id: tenantId ? new mongoose.Types.ObjectId(tenantId) : null,
        role_id: role._id,
        status: 'ACTIVE',
      });

      res.status(201).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: role.name,
          merchant_id: user.merchant_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
