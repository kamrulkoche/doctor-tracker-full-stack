import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error';

/** Catch-all for unmatched routes - same error envelope as everything else. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};
