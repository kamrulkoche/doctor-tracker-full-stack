import type { CookieOptions } from 'express';
import { env } from '../config/environment';

export const ACCESS_COOKIE = 'dt_access';
export const CSRF_COOKIE = 'dt_csrf';

/**
 * Attributes shared by the session and CSRF cookies.
 * Production runs cross-site (Vercel frontend, Render API), which requires
 * `SameSite=None; Secure`. Locally both apps are on `localhost`, so `Lax` over HTTP works.
 */
export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

/** Same attributes plus a `Max-Age` equal to the JWT lifetime. */
export function sessionCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), maxAge: env.jwtExpiresInSeconds * 1000 };
}
