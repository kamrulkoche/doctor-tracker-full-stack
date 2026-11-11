import type { Request } from 'express';
import { findSessionUser, verifyAccessToken, type AuthenticatedUser } from '../modules/auth/auth.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { ACCESS_COOKIE } from '../utils/cookies';

/**
 * Requires a valid `dt_access` session cookie. The JWT signature and expiry are verified,
 * then the account is re-read (one `_id` lookup) so a deleted admin loses access immediately
 * instead of when the token expires.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[ACCESS_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    throw AppError.unauthenticated();
  }

  const payload = verifyAccessToken(token);
  const user = await findSessionUser(payload.sub);
  if (!user) {
    throw AppError.unauthenticated('Your session is invalid or has expired');
  }

  req.user = user;
  next();
});

/** For handlers mounted behind `authenticate`: returns the user or fails loudly. */
export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}
