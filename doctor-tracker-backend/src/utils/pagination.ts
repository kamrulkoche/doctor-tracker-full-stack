import type { Pagination } from './api-response';

export interface PageRequest {
  page: number;
  limit: number;
}

export function toSkip({ page, limit }: PageRequest): number {
  return (page - 1) * limit;
}

export function buildPagination({ page, limit }: PageRequest, total: number): Pagination {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
