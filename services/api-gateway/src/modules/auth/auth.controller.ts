import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { Role } from '../../models/Role.js';
import { Merchant } from '../../models/Merchant.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError, UnauthorizedError, NotFoundError } from '../../errors/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'voxaflow_jwt_super_secret_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'voxaflow_refresh_super_secret_key_2026';

function generateTokens(user: any, roleName: string, permissions: string[]) {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    merchantId: user.merchant_id ? user.merchant_id.toString() : null,
    role: roleName,
    permissions,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId: user._id.toString() }, REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { merchant_name, merchant_code, industry, name, email, password } = req.body;

      if (!name || !email || !password) {
        throw new AppError('Name, email, and password are required', 400, 'VALIDATION_ERROR');
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('A user with this email address already exists', 409, 'VALIDATION_ERROR');
      }

      let merchant = null;
      if (merchant_name && merchant_code) {
        merchant = await Merchant.create({
          name: merchant_name,
          code: merchant_code.toLowerCase().trim(),
          industry: industry || 'GENERAL',
          contact_info: { email: email.toLowerCase() },
          status: 'ACTIVE',
        });
      }

      let merchantAdminRole = await Role.findOne({ name: 'MERCHANT_ADMIN' });
      if (!merchantAdminRole) {
        merchantAdminRole = await Role.create({
          name: 'MERCHANT_ADMIN',
          description: 'Full merchant administrative control',
          permissions: [
            'tenant:manage',
            'user:manage',
            'agent:manage',
            'prompt:manage',
            'prompt:eval',
            'experiment:manage',
            'product:manage',
            'discount:manage',
            'order:manage',
            'conversation:read',
            'voice:execute',
            'analytics:read',
            'audit:read',
          ],
          is_system: true,
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        merchant_id: merchant ? merchant._id : null,
        role_id: merchantAdminRole._id,
        status: 'ACTIVE',
      });

      const { accessToken, refreshToken } = generateTokens(user, 'MERCHANT_ADMIN', merchantAdminRole.permissions);

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: {
          token: accessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'MERCHANT_ADMIN',
            merchant_id: user.merchant_id,
          },
          merchant,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
      }

      const user = await User.findOne({ email: email.toLowerCase() }).populate<{ role_id: any }>('role_id');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedError('Account is disabled or pending activation');
      }

      const roleName = user.role_id?.name || 'CUSTOMER';
      const permissions = user.role_id?.permissions || [];
      const { accessToken, refreshToken } = generateTokens(user, roleName, permissions);

      user.last_login_at = new Date();
      await user.save();

      await AuditLog.create({
        merchant_id: user.merchant_id,
        actor_id: user._id,
        actor_email: user.email,
        action: 'USER_LOGIN',
        resource_type: 'User',
        resource_id: user._id.toString(),
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      let merchant = null;
      if (user.merchant_id) {
        merchant = await Merchant.findById(user.merchant_id);
      }

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          token: accessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: roleName,
            permissions,
            merchant_id: user.merchant_id,
          },
          merchant,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const user = await User.findById(req.user.userId).populate<{ role_id: any }>('role_id');
      if (!user) {
        throw new NotFoundError('User');
      }

      let merchant = null;
      if (user.merchant_id) {
        merchant = await Merchant.findById(user.merchant_id);
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: req.user.role,
            permissions: req.user.permissions,
            merchant_id: user.merchant_id,
          },
          merchant,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError('Missing refresh token');
      }

      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      const user = await User.findById(decoded.userId).populate<{ role_id: any }>('role_id');
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedError('User session expired');
      }

      const roleName = user.role_id?.name || 'CUSTOMER';
      const permissions = user.role_id?.permissions || [];
      const tokens = generateTokens(user, roleName, permissions);

      res.json({
        success: true,
        data: {
          token: tokens.accessToken,
        },
      });
    } catch (err) {
      next(new UnauthorizedError('Invalid or expired refresh token'));
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('refresh_token');
    res.json({ success: true, message: 'Logged out successfully' });
  }
}
