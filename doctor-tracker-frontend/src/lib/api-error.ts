import type { ApiErrorCode, ApiErrorDetail } from "@/types/api";

const KNOWN_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  "VALIDATION_ERROR",
  "INVALID_ID",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "CSRF_TOKEN_INVALID",
  "ORIGIN_NOT_ALLOWED",
  "NOT_FOUND",
  "DUPLICATE_EMAIL",
  "DOCTOR_HAS_PATIENTS",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR",
]);

const FALLBACK_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on the server. Please try again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

/** The one error type the UI ever sees from the data layer. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(params: { code: ApiErrorCode; message: string; status?: number; details?: ApiErrorDetail[] }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status ?? 0;
    this.details = params.details ?? [];
  }

  /** Message of the first detail whose path matches, if any. */
  detail(path: string): string | undefined {
    return this.details.find((item) => item.path === path)?.message;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    isRecord(item) && typeof item.path === "string" && typeof item.message === "string"
      ? [{ path: item.path, message: item.message }]
      : [],
  );
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "UNKNOWN_ERROR";
}

/**
 * Turns anything thrown by the HTTP layer into an ApiError. It reads the axios error shape
 * structurally (`error.response.status`, `error.response.data`) so it stays a pure function.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const response = isRecord(error) && isRecord(error.response) ? error.response : undefined;

  if (!response) {
    const cancelled = isRecord(error) && error.code === "ERR_CANCELED";
    return new ApiError({
      code: "NETWORK_ERROR",
      message: cancelled ? "The request was cancelled." : (FALLBACK_MESSAGES.NETWORK_ERROR ?? ""),
    });
  }

  const status = typeof response.status === "number" ? response.status : 0;
  const body = isRecord(response.data) && isRecord(response.data.error) ? response.data.error : undefined;

  if (body && typeof body.code === "string") {
    const code: ApiErrorCode = KNOWN_CODES.has(body.code)
      ? (body.code as ApiErrorCode)
      : codeFromStatus(status);
    const message =
      typeof body.message === "string" && body.message.trim().length > 0
        ? body.message
        : (FALLBACK_MESSAGES[code] ?? FALLBACK_MESSAGES.UNKNOWN_ERROR ?? "");
    return new ApiError({ code, message, status, details: toDetails(body.details) });
  }

  const code = codeFromStatus(status);
  return new ApiError({
    code,
    status,
    message: FALLBACK_MESSAGES[code] ?? FALLBACK_MESSAGES.UNKNOWN_ERROR ?? "",
  });
}

/** Human-readable message for toasts and error states. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === "NOT_FOUND" || error.code === "INVALID_ID");
}

/** Codes whose `details[].path` point at form fields. */
export function hasFieldErrors(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === "VALIDATION_ERROR" || error.code === "DUPLICATE_EMAIL") &&
    error.details.length > 0
  );
}

/**
 * Splits server details into errors for known form fields and the rest.
 * Only the first message per field is kept (that is what the form shows).
 */
export function splitFieldErrors<TField extends string>(
  error: ApiError,
  fields: readonly TField[],
): { fieldErrors: Partial<Record<TField, string>>; unmatched: ApiErrorDetail[] } {
  const known = new Set<string>(fields);
  const fieldErrors: Partial<Record<TField, string>> = {};
  const unmatched: ApiErrorDetail[] = [];
  for (const detail of error.details) {
    if (known.has(detail.path)) {
      const field = detail.path as TField;
      fieldErrors[field] ??= detail.message;
    } else {
      unmatched.push(detail);
    }
  }
  return { fieldErrors, unmatched };
}
