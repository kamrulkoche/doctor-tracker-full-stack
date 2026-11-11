import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, data, fail } from './helpers/api';

interface Health {
  status: string;
  uptime: number;
  timestamp: string;
  database: string;
}

describe('GET /api/health', () => {
  it('reports the service and database status without authentication', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({ success: true });
    const health = data<Health>(response);
    expect(health.status).toBe('ok');
    expect(health.database).toBe('connected');
    expect(typeof health.uptime).toBe('number');
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
  });
});

describe('platform behaviour', () => {
  it('sends security headers and never caches API responses', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns the error envelope for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);

    expect(fail(response)).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('rejects malformed JSON with VALIDATION_ERROR instead of a 500', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);

    expect(fail(response).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects bodies larger than 100kb', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(150_000) })
      .expect(413);

    expect(fail(response).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('allows credentialed CORS only for the configured frontend origin', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the CORS preflight with the allowed methods and headers', async () => {
    const response = await request(app)
      .options('/api/doctors')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
      .expect(204);

    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,X-CSRF-Token');
  });
});
