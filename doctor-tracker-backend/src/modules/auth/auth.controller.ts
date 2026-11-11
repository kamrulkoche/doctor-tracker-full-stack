import type { Request, Response } from 'express';
import { requireUser } from '../../middleware/authenticate';
import { issueCsrfToken } from '../../middleware/csrf';
import { validatedBody } from '../../middleware/validate-request';
import { sendSuccess } from '../../utils/api-response';
import { ACCESS_COOKIE, baseCookieOptions, sessionCookieOptions } from '../../utils/cookies';
import * as authService from './auth.service';
import { loginBodySchema } from './auth.validation';

export function getCsrfToken(req: Request, res: Response): void {
  sendSuccess(res, { csrfToken: issueCsrfToken(req, res) });
}

export async function login(_req: Request, res: Response): Promise<void> {
  const { user, token } = await authService.login(validatedBody(res, loginBodySchema));
  res.cookie(ACCESS_COOKIE, token, sessionCookieOptions());
  sendSuccess(res, { user }, { message: 'Signed in successfully' });
}

/** Idempotent: clearing an absent cookie is still a success. */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions());
  sendSuccess(res, null, { message: 'Signed out successfully' });
}

export function me(req: Request, res: Response): void {
  sendSuccess(res, { user: requireUser(req) });
}
