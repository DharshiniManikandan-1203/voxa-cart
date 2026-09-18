import { Request, Response, NextFunction } from 'express';
import { TenantAccessDeniedError, NotFoundError } from '../errors/AppError.js';
import { Merchant } from '../models/Merchant.js';

export async function enforceTenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    const requestedTenantHeader = req.headers['x-merchant-id'] as string | undefined;

    // Case 1: Authenticated Platform Super Admin (Global Scope)
    if (user && user.role === 'PLATFORM_ADMIN') {
      if (requestedTenantHeader) {
        req.tenantId = requestedTenantHeader;
      }
      return next();
    }

    // Case 2: Authenticated Merchant Staff / Admin (Scoped to their merchant)
    if (user && user.merchantId) {
      if (requestedTenantHeader && requestedTenantHeader !== user.merchantId) {
        throw new TenantAccessDeniedError(
          `Tenant violation: User from merchant [${user.merchantId}] cannot access merchant [${requestedTenantHeader}]`
        );
      }
      req.tenantId = user.merchantId;
      return next();
    }

    // Case 3: Public / Customer Playground endpoint (Requires explicit merchant identifier)
    if (requestedTenantHeader) {
      const merchant = await Merchant.findById(requestedTenantHeader);
      if (!merchant || merchant.status !== 'ACTIVE') {
        throw new NotFoundError(`Active merchant [${requestedTenantHeader}]`);
      }
      req.tenantId = merchant._id.toString();
      return next();
    }

    return next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware ensuring a valid tenant context is present on the request.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    return next(new TenantAccessDeniedError('Tenant context is required for this operation (Missing merchant identification)'));
  }
  next();
}
