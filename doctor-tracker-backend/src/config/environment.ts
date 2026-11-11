import 'dotenv/config';
import { z } from 'zod';

const DURATION_UNITS_IN_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3_600, d: 86_400 };

/** Parses `15m`, `12h`, `1d`, ... into seconds so the JWT `exp` and the cookie `Max-Age` always agree. */
const durationSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*[smhd]$/, 'Use <number><s|m|h|d>, e.g. 15m, 12h or 1d')
  .transform((value) => Number(value.slice(0, -1)) * (DURATION_UNITS_IN_SECONDS[value.slice(-1)] ?? 1));

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

const mongoUriSchema = z
  .string()
  .trim()
  .regex(/^mongodb(\+srv)?:\/\//, 'Must start with mongodb:// or mongodb+srv://');

const originSchema = z.string().refine((value) => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}, 'Each entry must be an exact origin such as https://app.example.com (no path, no trailing slash)');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
  MONGODB_URI: mongoUriSchema,
  MONGODB_URI_TEST: z.preprocess(emptyToUndefined, mongoUriSchema.optional()),
  JWT_SECRET: z.string().min(32, 'Must be at least 32 characters'),
  JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, durationSchema.default(86_400)),
  FRONTEND_URL: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(originSchema).min(1, 'Provide at least one origin')),
  COOKIE_DOMAIN: optionalString,
  ADMIN_NAME: optionalString,
  ADMIN_EMAIL: optionalString,
  ADMIN_PASSWORD: optionalString,
});

/** Extracts the database name from a MongoDB connection string without exposing credentials. */
export function databaseNameFromUri(uri: string): string {
  const withoutQuery = uri.split('?')[0] ?? '';
  const afterScheme = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, '');
  const slashIndex = afterScheme.indexOf('/');
  return slashIndex === -1 ? '' : afterScheme.slice(slashIndex + 1);
}

function fail(lines: string[]): never {
  // Only variable names and reasons are printed - never the values.
  console.error(
    ['Invalid environment configuration:', ...lines.map((line) => `  - ${line}`), 'See .env.example.'].join('\n'),
  );
  process.exit(1);
}

function loadEnvironment() {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }
  const raw = parsed.data;
  const isTest = raw.NODE_ENV === 'test';

  // Tests always run against the dedicated database and can never be pointed at real data.
  let mongoUri = raw.MONGODB_URI;
  if (isTest) {
    if (!raw.MONGODB_URI_TEST) {
      return fail(['MONGODB_URI_TEST: required when NODE_ENV=test']);
    }
    if (!databaseNameFromUri(raw.MONGODB_URI_TEST).endsWith('_test')) {
      return fail(['MONGODB_URI_TEST: the database name must end with "_test"']);
    }
    mongoUri = raw.MONGODB_URI_TEST;
  }

  return Object.freeze({
    nodeEnv: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    isTest,
    port: raw.PORT,
    mongoUri,
    jwtSecret: raw.JWT_SECRET,
    jwtExpiresInSeconds: raw.JWT_EXPIRES_IN,
    frontendOrigins: raw.FRONTEND_URL,
    cookieDomain: raw.COOKIE_DOMAIN,
    /** bcrypt work factor. Lowered under test purely for speed. */
    bcryptCost: isTest ? 4 : 12,
    admin: Object.freeze({
      name: raw.ADMIN_NAME,
      email: raw.ADMIN_EMAIL,
      password: raw.ADMIN_PASSWORD,
    }),
  });
}

export const env = loadEnvironment();
export type Environment = typeof env;
