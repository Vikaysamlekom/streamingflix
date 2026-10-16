import { Router } from 'express';
import { isDatabaseHealthy } from '../../config/database';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import { appVersion } from '../../config/env';

/**
 * GET /api/health
 * Cek kesehatan layanan dan database.
 */
export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const dbOk = await isDatabaseHealthy();

    sendSuccess(res, {
      status: dbOk ? 'ok' : 'degraded',
      version: appVersion,
      database: dbOk ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }),
);
