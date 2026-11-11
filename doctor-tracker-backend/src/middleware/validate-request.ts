import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError, type ErrorDetail } from '../utils/app-error';

interface RequestSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

type RequestPart = keyof RequestSchemas;

const VALIDATED_KEY = 'validated';

/** Converts Zod issues into the contract's `{ path, message }` details (dot paths). */
export function zodIssuesToDetails(issues: z.core.$ZodIssue[]): ErrorDetail[] {
  return issues.flatMap((issue): ErrorDetail[] => {
    const basePath = issue.path.map(String).join('.');
    if (issue.code === 'unrecognized_keys') {
      // Strict bodies: report each unknown field under its own name.
      return issue.keys.map((key) => ({
        path: basePath ? `${basePath}.${key}` : key,
        message: 'Unknown field',
      }));
    }
    return [{ path: basePath, message: issue.message }];
  });
}

interface ValidatedStore {
  schemas: RequestSchemas;
  output: Partial<Record<RequestPart, unknown>>;
}

/**
 * Validates the selected request parts with Zod and stores the parsed output in
 * `res.locals` (Express 5 exposes `req.query` as a read-only getter, so nothing is mutated).
 * Controllers read it back with `validatedBody` / `validatedQuery` / `validatedParams`.
 */
export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (req, res, next) => {
    const output: ValidatedStore['output'] = {};
    const details: ErrorDetail[] = [];

    // Params first: a malformed `:id` is reported as INVALID_ID, not as a field error.
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        next(AppError.invalidId());
        return;
      }
      output.params = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) output.query = result.data;
      else details.push(...zodIssuesToDetails(result.error.issues));
    }

    if (schemas.body) {
      // A missing or non-JSON body is validated as an empty object, so every required
      // field is reported instead of one opaque "expected object" error.
      const body: unknown = req.body ?? {};
      const result = schemas.body.safeParse(body);
      if (result.success) output.body = result.data;
      else details.push(...zodIssuesToDetails(result.error.issues));
    }

    if (details.length > 0) {
      next(AppError.validation(details));
      return;
    }

    const store: ValidatedStore = { schemas, output };
    res.locals[VALIDATED_KEY] = store;
    next();
  };
}

/**
 * Returns the output of the schema the route validated with. The schema is passed in again
 * so the return type is inferred from it, and it is compared by identity with the one
 * `validateRequest` actually ran - a controller can never read data under the wrong type.
 */
function readValidated<S extends z.ZodType>(res: Response, part: RequestPart, schema: S): z.output<S> {
  const store = res.locals[VALIDATED_KEY] as ValidatedStore | undefined;
  if (store?.schemas[part] !== schema) {
    // Programming error (route and controller disagree) - surfaces as a 500 in tests.
    throw new Error(`Request ${part} was not validated with the schema this controller expects`);
  }
  return store.output[part] as z.output<S>;
}

export const validatedBody = <S extends z.ZodType>(res: Response, schema: S): z.output<S> =>
  readValidated(res, 'body', schema);
export const validatedQuery = <S extends z.ZodType>(res: Response, schema: S): z.output<S> =>
  readValidated(res, 'query', schema);
export const validatedParams = <S extends z.ZodType>(res: Response, schema: S): z.output<S> =>
  readValidated(res, 'params', schema);
