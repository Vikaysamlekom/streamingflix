import '../helpers/env';
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { closePool } from '../../src/config/database';

/**
 * Alur autentikasi (butuh database MySQL aktif).
 *
 * Dinonaktifkan secara default. Jalankan dengan:
 *   TEST_DB=true npx vitest run tests/integration/auth-flow.test.ts
 */
const hasDb = process.env.TEST_DB === 'true';
const app = createApp();

describe.skipIf(!hasDb)('auth flow (requires TEST_DB=true)', () => {
  afterAll(async () => {
    await closePool();
  });

  it('GET /api/auth/csrf-token returns a token', async () => {
    const res = await request(app).get('/api/auth/csrf-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.csrfToken).toBe('string');
    expect(res.body.data.csrfToken.length).toBeGreaterThan(0);
  });

  it('GET /api/auth/me without a session returns 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('POST /api/admin/movies without a session returns 401', async () => {
    const res = await request(app)
      .post('/api/admin/movies')
      .send({ title: 'Film', videoUrl: 'https://cdn.example.com/v.mp4' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/logout without a CSRF token returns 403', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });
});
