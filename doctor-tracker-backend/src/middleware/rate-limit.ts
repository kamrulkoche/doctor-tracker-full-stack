import { rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/environment';
import { AppError } from '../utils/app-error';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Deterministic tests: limits are switched off entirely under NODE_ENV=test.
  skip: () => env.isTest,
};

function rateLimited(message: string): Options['handler'] {
  return (_req, _res, next) => {
    next(new AppError(429, 'RATE_LIMITED', message));
  };
}

/** 300 requests per minute per IP across the whole API. */
export const globalRateLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: 300,
  handler: rateLimited('Too many requests. Please slow down and try again shortly.'),
});

/** 10 failed login attempts per 15 minutes per IP. Successful logins are not counted. */
export const loginRateLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: rateLimited('Too many login attempts. Please try again in 15 minutes.'),
});
