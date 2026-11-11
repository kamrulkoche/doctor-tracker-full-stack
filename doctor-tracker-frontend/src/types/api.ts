/** Wire-level envelopes defined in documentation/API_CONTRACT.md §1. */

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiListSuccess<T> = ApiSuccess<T[]> & {
  pagination: Pagination;
};

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_ID"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "CSRF_TOKEN_INVALID"
  | "ORIGIN_NOT_ALLOWED"
  | "NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "DOCTOR_HAS_PATIENTS"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  // Client-side only: the request never produced a contract-shaped response.
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
};

/** What list hooks hand to the UI. */
export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type SortOrder = "asc" | "desc";

/** Query params shared by every list endpoint (§3). */
export type ListQuery<TSort extends string> = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: TSort;
  sortOrder?: SortOrder;
  from?: string;
  to?: string;
};

export type DateRange = {
  from?: string;
  to?: string;
};
