import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { normalizeApiError } from "@/lib/api-error";
import type { ApiListSuccess, ApiSuccess, Paginated } from "@/types/api";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Set once a request has been replayed after `403 CSRF_TOKEN_INVALID`. */
    _csrfRetried?: boolean;
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/+$/, "");

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);
const CSRF_HEADER = "X-CSRF-Token";
const CSRF_TOKEN_PATH = "/auth/csrf-token";

/** The single configured HTTP client. Every request carries the session cookie. */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: "application/json" },
});

/* ------------------------------------------------------------------ CSRF -- */
// The token lives in memory only. It is fetched lazily before the first unsafe
// request and refreshed once if the server answers 403 CSRF_TOKEN_INVALID.

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function fetchCsrfToken(): Promise<string> {
  csrfRequest ??= apiClient
    .get<ApiSuccess<{ csrfToken: string }>>(CSRF_TOKEN_PATH)
    .then((response) => {
      csrfToken = response.data.data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

export function resetCsrfToken(): void {
  csrfToken = null;
}

/* ------------------------------------------------- unauthenticated hook -- */

type UnauthenticatedHandler = () => void;
let unauthenticatedHandler: UnauthenticatedHandler | null = null;

/** Registered once by the app providers; returns an unsubscribe function. */
export function onUnauthenticated(handler: UnauthenticatedHandler): () => void {
  unauthenticatedHandler = handler;
  return () => {
    if (unauthenticatedHandler === handler) unauthenticatedHandler = null;
  };
}

function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(url && /^\/?auth\//.test(url));
}

/* ----------------------------------------------------------- interceptors -- */

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (UNSAFE_METHODS.has((config.method ?? "get").toLowerCase())) {
    const token = csrfToken ?? (await fetchCsrfToken());
    config.headers.set(CSRF_HEADER, token);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = normalizeApiError(error);
    const config = axios.isAxiosError(error) ? error.config : undefined;

    if (apiError.code === "CSRF_TOKEN_INVALID" && config && !config._csrfRetried) {
      // Single retry with a fresh token (the request interceptor fetches it).
      config._csrfRetried = true;
      resetCsrfToken();
      return apiClient.request(config);
    }

    if (apiError.code === "UNAUTHENTICATED" && !isAuthEndpoint(config?.url)) {
      unauthenticatedHandler?.();
    }

    return Promise.reject(apiError);
  },
);

/* ---------------------------------------------------------- typed helpers -- */

export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<ApiSuccess<T>>(url, config);
  return response.data.data;
}

export async function getList<T>(url: string, config?: AxiosRequestConfig): Promise<Paginated<T>> {
  const response = await apiClient.get<ApiListSuccess<T>>(url, config);
  return { items: response.data.data, pagination: response.data.pagination };
}

export async function postData<T, TBody = unknown>(url: string, body?: TBody): Promise<T> {
  const response = await apiClient.post<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function putData<T, TBody = unknown>(url: string, body: TBody): Promise<T> {
  const response = await apiClient.put<ApiSuccess<T>>(url, body);
  return response.data.data;
}

export async function deleteData(url: string): Promise<void> {
  await apiClient.delete<ApiSuccess<null>>(url);
}
