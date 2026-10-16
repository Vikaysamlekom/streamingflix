import '../helpers/env';
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { closePool } from '../../src/config/database';

/**
 * Health check integration test.
 * Tidak memerlukan database aktif — endpoint tetap 200 dengan
 * data.database bernilai 'connected' ATAU 'disconnected'.
 */
const app = createApp();

describe('GET /api/health', () => {
  afterAll(async () => {
    await closePool();
  });

  it('responds with a success envelope and a database status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['connected', 'disconnected']).toContain(res.body.data.database);
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});
