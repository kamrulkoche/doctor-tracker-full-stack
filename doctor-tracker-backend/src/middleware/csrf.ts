import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import { env } from '../config/environment';
import { AppError } from '../utils/app-error';
import { CSRF_COOKIE, sessionCookieOptions } from '../utils/cookies';

/*
 * Signed double-submit CSRF protection.
 *
 * - `dt_csrf` (HTTP-only cookie) holds a random per-browser secret.
 * - The token is HMAC-SHA256(secret) under a key derived from JWT_SECRET. It is handed to the
 *   frontend in a response *body*, which only an allow-listed CORS origin can read.
 * - Unsafe requests must echo the token in `X-CSRF-Token`. An attacker's page can make the
 *   browser send the cookie but can neither read the token nor forge it without the key.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SECRET_PATTERN = /^[0-9a-f]{64}$/;
const CSRF_HEADER = 'x-csrf-token';

// A dedicated key, so the CSRF HMAC never shares key material directly with JWT signing.
const csrfKey = createHmac('sha256', env.jwtSecret).update('doctor-tracker:csrf:v1').digest();

function readSecret(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[CSRF_COOKIE];
  return typeof value === 'string' && SECRET_PATTERN.test(value) ? value : null;
}

function signSecret(secret: string): string {
  return createHmac('sha256', csrfKey).update(secret).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Reuses the browser's existing secret (or creates one), refreshes the cookie, returns the token. */
export function issueCsrfToken(req: Request, res: Response): string {
  const secret = readSecret(req) ?? randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, secret, sessionCookieOptions());
  return signSecret(secret);
}

/** Rejects unsafe requests from foreign origins or without a valid `X-CSRF-Token`. */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Browsers always send Origin on cross-origin unsafe requests. Non-browser clients
  // (curl, server-to-server) send none and still have to pass the token check below.
  const origin = req.get('origin');
  if (origin !== undefined && !env.frontendOrigins.includes(origin)) {
    next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Requests from this origin are not allowed'));
    return;
  }

  const secret = readSecret(req);
  const token = req.get(CSRF_HEADER);
  if (!secret || !token || !safeEqual(token, signSecret(secret))) {
    next(new AppError(403, 'CSRF_TOKEN_INVALID', 'Missing or invalid CSRF token'));
    return;
  }

  next();
};
