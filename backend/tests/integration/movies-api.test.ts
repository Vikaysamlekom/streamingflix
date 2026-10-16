import '../helpers/env';
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { closePool } from '../../src/config/database';

/**
 * API film publik (butuh database MySQL aktif).
 *
 * Dinonaktifkan secara default. Jalankan dengan:
 *   TEST_DB=true npx vitest run tests/integration/movies-api.test.ts
 */
const hasDb = process.env.TEST_DB === 'true';
const app = createApp();

describe.skipIf(!hasDb)('movies API (requires TEST_DB=true)', () => {
  afterAll(async () => {
    await closePool();
  });

  it('GET /api/movies returns a 200 envelope with array data', async () => {
    const res = await request(app).get('/api/movies');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBeTypeOf('number');
    expect(res.body.meta.limit).toBeTypeOf('number');
  });

  it('GET /api/movies?sort=evil does not 500 nor leak SQL', async () => {
    const res = await request(app).get('/api/movies').query({ sort: 'evil' });

    // Skema menolak nilai tak dikenal (422) atau fallback aman (200), tak pernah 500.
    expect(res.status).not.toBe(500);
    expect([200, 400, 422]).toContain(res.status);

    const serialized = JSON.stringify(res.body).toLowerCase();
    expect(serialized).not.toContain('order by');
    expect(serialized).not.toContain('select ');
    expect(serialized).not.toContain('drop table');
  });

  it('GET /api/home returns 200 with the expected section keys', async () => {
    const res = await request(app).get('/api/home');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    for (const key of ['hero', 'trending', 'newReleases', 'top10', 'genreRows']) {
      expect(res.body.data).toHaveProperty(key);
    }
    expect(Array.isArray(res.body.data.hero)).toBe(true);
  });

  it('GET /api/movies/:slug returns 404 NOT_FOUND for an unknown slug', async () => {
    const res = await request(app).get('/api/movies/nonexistent-slug-xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
