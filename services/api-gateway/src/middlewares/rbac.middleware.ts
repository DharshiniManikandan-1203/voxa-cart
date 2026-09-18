import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

export function requirePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Authentication required to verify permissions'));
    }

    // Platform Super Admin bypasses individual permission checks
    if (user.role === 'PLATFORM_ADMIN') {
      return next();
    }

    if (!user.permissions || !user.permissions.includes(requiredPermission)) {
      return next(
        new ForbiddenError(
          `Action forbidden: Missing required permission [${requiredPermission}] for role [${user.role}]`
        )
      );
    }

    next();
  };
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        new ForbiddenError(`Role [${user.role}] is not authorized. Required: [${allowedRoles.join(', ')}]`)
      );
    }

    next();
  };
}
