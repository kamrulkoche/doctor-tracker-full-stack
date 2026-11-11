import type { RequestHandler } from 'express';
import type { UserRole } from '../models/user.model';
import { AppError } from '../utils/app-error';

/** Role gate. Must run after `authenticate`. */
export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
