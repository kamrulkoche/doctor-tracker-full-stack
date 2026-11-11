import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/environment';
import { User } from '../src/models/user.model';
import { ApiClient, app, data, errorPaths, fail, ok, setCookies } from './helpers/api';
import { ADMIN, UNKNOWN_ID, clearDatabase, createAdmin } from './helpers/db';

interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

let adminId: string;

beforeAll(async () => {
  await clearDatabase();
  adminId = await createAdmin();
});

describe('GET /api/auth/csrf-token', () => {
  it('issues a token and an HTTP-only secret cookie', async () => {
    const response = await request(app).get('/api/auth/csrf-token').expect(200);

    expect(data<{ csrfToken: string }>(response).csrfToken).toMatch(/^[0-9a-f]{64}$/);
    const cookie = setCookies(response).find((value) => value.startsWith('dt_csrf='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    // The token is derived from the secret, never equal to it.
    expect(cookie).not.toContain(data<{ csrfToken: string }>(response).csrfToken);
  });

  it('reuses the existing secret, so the token is stable for a browser', async () => {
    const client = await ApiClient.create();
    const again = await client.get('/api/auth/csrf-token').expect(200);

    expect(data<{ csrfToken: string }>(again).csrfToken).toBe(client.csrfToken);
  });
});

describe('CSRF protection on unsafe methods', () => {
  const credentials = { email: ADMIN.email, password: ADMIN.password };

  it('rejects a request without a token', async () => {
    const client = await ApiClient.create();
    const response = await client.agent.post('/api/auth/login').send(credentials).expect(403);

    expect(fail(response)).toMatchObject({ success: false, error: { code: 'CSRF_TOKEN_INVALID' } });
  });

  it('rejects a request with a token but no secret cookie', async () => {
    const client = await ApiClient.create();
    const response = await request(app)
      .post('/api/auth/login')
      .set('X-CSRF-Token', client.csrfToken)
      .send(credentials)
      .expect(403);

    expect(fail(response).error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects a forged token', async () => {
    const client = await ApiClient.create();
    const response = await client.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'a'.repeat(64))
      .send(credentials)
      .expect(403);

    expect(fail(response).error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it("rejects a token that belongs to another browser's secret", async () => {
    const [victim, attacker] = await Promise.all([ApiClient.create(), ApiClient.create()]);
    const response = await victim.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', attacker.csrfToken)
      .send(credentials)
      .expect(403);

    expect(fail(response).error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects unsafe requests from an origin outside the allowlist', async () => {
    const client = await ApiClient.create();
    const response = await client.login().set('Origin', 'https://evil.example').expect(403);

    expect(fail(response).error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('accepts unsafe requests from the allowed origin', async () => {
    const client = await ApiClient.create();
    await client.login().set('Origin', 'http://localhost:3000').expect(200);
  });

  it('protects logout as well', async () => {
    const client = await ApiClient.createAuthenticated();
    const response = await client.agent.post('/api/auth/logout').expect(403);

    expect(fail(response).error.code).toBe('CSRF_TOKEN_INVALID');
    await client.get('/api/auth/me').expect(200); // still signed in
  });
});

describe('POST /api/auth/login', () => {
  it('signs in and sets an HTTP-only session cookie', async () => {
    const client = await ApiClient.create();
    const response = await client.login().expect(200);

    const body = ok<{ user: UserDto }>(response);
    expect(body.success).toBe(true);
    expect(body.data.user).toEqual({ id: adminId, name: ADMIN.name, email: ADMIN.email, role: 'admin' });
    expect(JSON.stringify(response.body)).not.toContain('password');

    const cookie = setCookies(response).find((value) => value.startsWith('dt_access='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${env.jwtExpiresInSeconds}`);
    expect(cookie).not.toContain('Secure'); // only set in production
  });

  it('puts only { sub, role } in the token', async () => {
    const client = await ApiClient.create();
    const response = await client.login().expect(200);
    const cookie = setCookies(response).find((value) => value.startsWith('dt_access=')) ?? '';
    const token = cookie.slice('dt_access='.length, cookie.indexOf(';'));

    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    expect(payload).toMatchObject({ sub: adminId, role: 'admin' });
    expect(Object.keys(payload as object).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
  });

  it('treats the email as case-insensitive', async () => {
    const client = await ApiClient.create();
    await client.login({ email: `  ${ADMIN.email.toUpperCase()} `, password: ADMIN.password }).expect(200);
  });

  it('rejects a wrong password and an unknown email with the same response', async () => {
    const client = await ApiClient.create();
    const wrongPassword = await client.login({ email: ADMIN.email, password: 'not-the-password' }).expect(401);
    const unknownEmail = await client.login({ email: 'nobody@test.dev', password: ADMIN.password }).expect(401);

    expect(fail(wrongPassword).error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(setCookies(wrongPassword).some((value) => value.startsWith('dt_access='))).toBe(false);
  });

  it('validates the body and reports each field', async () => {
    const client = await ApiClient.create();

    const empty = await client.post('/api/auth/login', {}).expect(400);
    expect(fail(empty).error.code).toBe('VALIDATION_ERROR');
    expect(errorPaths(empty).sort()).toEqual(['email', 'password']);

    const badEmail = await client.post('/api/auth/login', { email: 'not-an-email', password: 'x' }).expect(400);
    expect(fail(badEmail).error.details).toEqual([{ path: 'email', message: 'Enter a valid email address' }]);

    const unknownField = await client
      .post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password, role: 'admin' })
      .expect(400);
    expect(errorPaths(unknownField)).toEqual(['role']);
  });

  it('has no registration endpoint', async () => {
    const client = await ApiClient.create();
    await client.post('/api/auth/register', { email: 'new@test.dev', password: 'Password-123' }).expect(404);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const client = await ApiClient.createAuthenticated();
    const response = await client.get('/api/auth/me').expect(200);

    expect(data<{ user: UserDto }>(response).user).toEqual({
      id: adminId,
      name: ADMIN.name,
      email: ADMIN.email,
      role: 'admin',
    });
  });

  it('returns 401 without a session cookie', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);

    expect(fail(response)).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });

  it.each([
    ['a garbage token', () => 'not-a-jwt'],
    ['a token signed with another secret', () => jwt.sign({ role: 'admin' }, 'x'.repeat(40), { subject: adminId })],
    [
      'an expired token',
      () => jwt.sign({ role: 'admin' }, env.jwtSecret, { subject: adminId, expiresIn: -60 }),
    ],
    [
      'an unsigned (alg=none) token',
      () => jwt.sign({ role: 'admin' }, '', { subject: adminId, algorithm: 'none' }),
    ],
    ['a token for a user that no longer exists', () => jwt.sign({ role: 'admin' }, env.jwtSecret, { subject: UNKNOWN_ID })],
    ['a token with an unknown role', () => jwt.sign({ role: 'root' }, env.jwtSecret, { subject: adminId })],
  ])('returns 401 for %s', async (_label, buildToken) => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `dt_access=${buildToken()}`)
      .expect(401);

    expect(fail(response).error.code).toBe('UNAUTHENTICATED');
  });

  it('never returns the password hash, which is excluded from queries by default', async () => {
    const user = await User.findOne({ email: ADMIN.email }).lean();
    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty('password');

    const withPassword = await User.findOne({ email: ADMIN.email }).select('+password').lean();
    expect(withPassword?.password).toMatch(/^\$2[aby]\$/);
    expect(withPassword?.password).not.toContain(ADMIN.password);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const client = await ApiClient.createAuthenticated();
    await client.get('/api/auth/me').expect(200);

    const response = await client.post('/api/auth/logout').expect(200);
    expect(ok<null>(response)).toMatchObject({ success: true, data: null });
    expect(setCookies(response).some((value) => value.startsWith('dt_access=;'))).toBe(true);

    await client.get('/api/auth/me').expect(401);
  });

  it('is idempotent when nobody is signed in', async () => {
    const client = await ApiClient.create();
    await client.post('/api/auth/logout').expect(200);
    await client.post('/api/auth/logout').expect(200);
  });
});

describe('protected routers', () => {
  const id = UNKNOWN_ID;
  const readRoutes = [
    '/api/doctors',
    '/api/doctors/filters',
    '/api/doctors/options',
    `/api/doctors/${id}`,
    `/api/doctors/${id}/patients`,
    '/api/patients',
    '/api/patients/filters',
    `/api/patients/${id}`,
    '/api/dashboard/stats',
    '/api/dashboard/patient-growth',
    '/api/dashboard/patients-per-doctor',
    '/api/dashboard/condition-distribution',
    '/api/dashboard/doctor-statistics',
    '/api/dashboard/recent-activity',
  ];

  it.each(readRoutes)('GET %s requires authentication', async (path) => {
    const response = await request(app).get(path).expect(401);

    expect(fail(response)).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });

  const writeRoutes: ['post' | 'put' | 'delete', string][] = [
    ['post', '/api/doctors'],
    ['put', `/api/doctors/${id}`],
    ['delete', `/api/doctors/${id}`],
    ['post', `/api/doctors/${id}/patients`],
    ['post', '/api/patients'],
    ['put', `/api/patients/${id}`],
    ['delete', `/api/patients/${id}`],
  ];

  it.each(writeRoutes)('%s %s requires authentication even with a valid CSRF token', async (method, path) => {
    const client = await ApiClient.create();
    const response = await (method === 'delete' ? client.delete(path) : client[method](path, {})).expect(401);

    expect(fail(response).error.code).toBe('UNAUTHENTICATED');
  });
});
