export type ErrorCode =
  | 'TENANT_ACCESS_DENIED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'INVENTORY_UNAVAILABLE'
  | 'INVALID_PROMPT_VARIABLE'
  | 'PROMPT_IMMUTABLE_ERROR'
  | 'TOOL_EXECUTION_FAILED'
  | 'TOOL_VALIDATION_ERROR'
  | 'DISCOUNT_INVALID'
  | 'ORDER_CREATION_FAILED'
  | 'LLM_TIMEOUT'
  | 'STT_FAILURE'
  | 'TTS_FAILURE'
  | 'EXTERNAL_API_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 400, errorCode: ErrorCode = 'VALIDATION_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TenantAccessDeniedError extends AppError {
  constructor(message: string = 'Access denied: Tenant isolation violation') {
    super(message, 403, 'TENANT_ACCESS_DENIED');
    this.name = 'TenantAccessDeniedError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ToolExecutionError extends AppError {
  constructor(toolName: string, reason: string, details?: any) {
    super(`Tool [${toolName}] execution failed: ${reason}`, 422, 'TOOL_EXECUTION_FAILED', details);
    this.name = 'ToolExecutionError';
  }
}
