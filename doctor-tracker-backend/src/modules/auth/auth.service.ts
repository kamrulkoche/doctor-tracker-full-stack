import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/environment';
import { USER_ROLES, User, type UserRole } from '../../models/user.model';
import { AppError } from '../../utils/app-error';
import { objectIdSchema } from '../../utils/validation';
import type { LoginBody } from './auth.validation';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

const JWT_ALGORITHM = 'HS256';

const accessTokenPayloadSchema = z.object({
  sub: objectIdSchema,
  role: z.enum(USER_ROLES),
});

interface UserLike {
  _id: { toString(): string };
  name: string;
  email: string;
  role: UserRole;
}

function toAuthenticatedUser(user: UserLike): AuthenticatedUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, env.bcryptCost);
}

/**
 * Hash compared against when the email is unknown, so "no such user" costs the same
 * bcrypt work as "wrong password" and response time cannot be used to enumerate accounts.
 */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('doctor-tracker-timing-safe-placeholder');
  return dummyHash;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ role: payload.role }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    subject: payload.sub,
    expiresIn: env.jwtExpiresInSeconds,
  });
}

/** Verifies signature, algorithm and expiry, then the payload shape. Throws 401 otherwise. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] });
  } catch {
    throw AppError.unauthenticated('Your session is invalid or has expired');
  }
  const payload = accessTokenPayloadSchema.safeParse(decoded);
  if (!payload.success) {
    throw AppError.unauthenticated('Your session is invalid or has expired');
  }
  return payload.data;
}

export async function login(credentials: LoginBody): Promise<{ user: AuthenticatedUser; token: string }> {
  const user = await User.findOne({ email: credentials.email }).select('+password name email role').lean();

  const passwordMatches = await bcrypt.compare(credentials.password, user?.password ?? (await getDummyHash()));
  if (!user || !passwordMatches) {
    // One message for both cases: never reveal whether the email exists.
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const authenticated = toAuthenticatedUser(user);
  return { user: authenticated, token: signAccessToken({ sub: authenticated.id, role: authenticated.role }) };
}

/** Loads the account behind a verified token. Null when it no longer exists. */
export async function findSessionUser(userId: string): Promise<AuthenticatedUser | null> {
  const user = await User.findById(userId).select('name email role').lean();
  return user ? toAuthenticatedUser(user) : null;
}
