import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

export interface AuthUserPayload {
  userId: string;
  email: string;
  merchantId: string | null;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'voxaflow_jwt_super_secret_key_2026';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Missing or malformed authentication token');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId).populate<{ role_id: any }>('role_id');

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User session expired or account disabled');
    }

    const roleDoc = user.role_id;
    const roleName = roleDoc ? roleDoc.name : 'CUSTOMER';
    const permissions = roleDoc ? roleDoc.permissions || [] : [];

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      merchantId: user.merchant_id ? user.merchant_id.toString() : null,
      role: roleName,
      permissions,
    };

    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new UnauthorizedError(`Invalid authentication token: ${err.message}`));
    } else {
      next(err);
    }
  }
}
