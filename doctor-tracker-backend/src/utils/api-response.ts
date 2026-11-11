import type { Response } from 'express';
import type { ErrorCode, ErrorDetail } from './app-error';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

interface SuccessOptions {
  status?: number;
  message?: string;
}

/** `{ success: true, message?, data }` - the only success shape the API emits. */
export function sendSuccess(res: Response, data: unknown, options: SuccessOptions = {}): void {
  const { status = 200, message } = options;
  res.status(status).json({ success: true, ...(message ? { message } : {}), data });
}

export function sendPaginated(res: Response, page: Paginated<unknown>): void {
  res.status(200).json({ success: true, data: page.items, pagination: page.pagination });
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details && details.length > 0 ? { details } : {}) },
  });
}
