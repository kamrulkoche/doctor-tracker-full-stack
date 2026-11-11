export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_ID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'CSRF_TOKEN_INVALID'
  | 'ORIGIN_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'DUPLICATE_EMAIL'
  | 'DOCTOR_HAS_PATIENTS'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  path: string;
  message: string;
}

/** An expected, client-facing failure. Anything else that reaches the error handler is a 500. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(statusCode: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static validation(details: ErrorDetail[], message = 'Request validation failed'): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static invalidId(message = 'The provided id is not a valid identifier'): AppError {
    return new AppError(400, 'INVALID_ID', message);
  }

  static unauthenticated(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }
}
