import { z } from 'zod';
import { isValidDay } from './date-range';

/** Query strings arrive as `""` when a filter is cleared in the UI - treat that as "not provided". */
export const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Body fields documented as optional: `""`, `null` and omitted all mean "unset". */
export const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const objectIdSchema = z
  .string('Must be a valid 24-character id')
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24-character id');

export const idParamsSchema = z.object({ id: objectIdSchema });
export type IdParams = z.infer<typeof idParamsSchema>;

export const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

export const phoneSchema = z
  .string('Phone is required')
  .trim()
  .regex(PHONE_PATTERN, 'Enter a valid phone number (7-20 digits, may include + - ( ) and spaces)');

export const emailSchema = z
  .string('Email is required')
  .trim()
  .toLowerCase()
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email('Enter a valid email address'));

/** A required, trimmed text field with length bounds and readable messages. */
export function textField(label: string, min: number, max: number) {
  return z
    .string(`${label} is required`)
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);
}

/** An optional query-string value where an empty string counts as absent. */
export function optionalQuery<T extends z.ZodType>(schema: T) {
  return z.preprocess(emptyToUndefined, schema.optional());
}

const daySchema = z.string().refine(isValidDay, 'Use a valid date in YYYY-MM-DD format');

export const dateRangeQueryShape = {
  from: optionalQuery(daySchema),
  to: optionalQuery(daySchema),
};

/** Shared refinement: `from` must not be after `to`. */
export function refineDateRange(value: { from?: string; to?: string }, ctx: z.RefinementCtx): void {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: '"to" must be on or after "from"' });
  }
}

export function intQuery(options: { min: number; max: number; fallback: number }) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number('Must be a number')
      .int('Must be a whole number')
      .min(options.min, `Must be at least ${options.min}`)
      .max(options.max, `Must be at most ${options.max}`)
      .default(options.fallback),
  );
}

export const sortOrderSchema = z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default('desc'));
export type SortOrder = 'asc' | 'desc';

/** `page`, `limit`, `search`, `sortOrder`, `from`, `to` - identical on every list endpoint. */
export const listQueryShape = {
  page: intQuery({ min: 1, max: 1_000_000, fallback: 1 }),
  limit: intQuery({ min: 1, max: 100, fallback: 10 }),
  search: optionalQuery(z.string().trim().max(100, 'Search must be at most 100 characters')),
  sortOrder: sortOrderSchema,
  ...dateRangeQueryShape,
};
