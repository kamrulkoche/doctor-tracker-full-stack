import request, { type Response, type Test } from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { createApp } from '../../src/app';
import type { Pagination } from '../../src/utils/api-response';
import { ADMIN } from './db';

export const app = createApp();

export interface SuccessBody<T> {
  success: true;
  message?: string;
  data: T;
  pagination?: Pagination;
}

export interface ErrorBody {
  success: false;
  error: { code: string; message: string; details?: { path: string; message: string }[] };
}

/** Typed views of a response body (supertest exposes it as `any`). */
export const ok = <T>(response: Response): SuccessBody<T> => response.body as SuccessBody<T>;
export const fail = (response: Response): ErrorBody => response.body as ErrorBody;
export const data = <T>(response: Response): T => ok<T>(response).data;
export const errorPaths = (response: Response): string[] =>
  (fail(response).error.details ?? []).map((detail) => detail.path);

export function setCookies(response: Response): string[] {
  const header: unknown = response.headers['set-cookie'];
  return Array.isArray(header) ? header.map(String) : [];
}

/**
 * A browser-like client: keeps cookies between requests and attaches the CSRF token to
 * every unsafe method, exactly as the frontend's HTTP client does.
 */
export class ApiClient {
  private constructor(
    readonly agent: TestAgent,
    readonly csrfToken: string,
  ) {}

  static async create(): Promise<ApiClient> {
    const agent = request.agent(app);
    const response = await agent.get('/api/auth/csrf-token').expect(200);
    return new ApiClient(agent, data<{ csrfToken: string }>(response).csrfToken);
  }

  /** A client that is already signed in as the test admin. */
  static async createAuthenticated(): Promise<ApiClient> {
    const client = await ApiClient.create();
    await client.login().expect(200);
    return client;
  }

  login(credentials: { email: string; password: string } = ADMIN): Test {
    return this.post('/api/auth/login', { email: credentials.email, password: credentials.password });
  }

  get(path: string): Test {
    return this.agent.get(path);
  }

  post(path: string, body?: object): Test {
    return this.agent.post(path).set('X-CSRF-Token', this.csrfToken).send(body);
  }

  put(path: string, body?: object): Test {
    return this.agent.put(path).set('X-CSRF-Token', this.csrfToken).send(body);
  }

  delete(path: string): Test {
    return this.agent.delete(path).set('X-CSRF-Token', this.csrfToken);
  }
}
