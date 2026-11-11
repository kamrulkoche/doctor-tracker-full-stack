import type { AuthenticatedUser } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware once the session cookie has been verified. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
