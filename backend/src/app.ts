import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isTest } from './config/env';
import { createSessionMiddleware } from './config/session';
import { logger } from './utils/logger';
import { apiLimiter } from './middlewares/rate-limit';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found';
import { asyncHandler } from './utils/async-handler';
import { sendSuccess } from './utils/response';

// Modul
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { adminAccountRouter } from './modules/auth/account.routes';
import {
  publicMovieRouter,
  adminMovieRouter,
} from './modules/movies/movie.routes';
import {
  publicCategoryRouter,
  adminCategoryRouter,
} from './modules/categories/category.routes';
import { adminDashboardRouter } from './modules/dashboard/dashboard.routes';
import {
  adminSettingsRouter,
  publicSettingsRouter,
} from './modules/settings/settings.routes';
import { getHomeData } from './modules/movies/movie.service';

/**
 * Membuat instance aplikasi Express.
 * Dipakai oleh server.ts (runtime) dan test (Supertest).
 */
export function createApp(): Express {
  const app = express();

  // Percaya proxy (untuk cookie secure & rate limit di balik reverse proxy).
  if (env.TRUST_PROXY > 0) {
    app.set('trust proxy', env.TRUST_PROXY);
  }

  // Header keamanan
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS hanya untuk FRONTEND_URL, dengan credentials.
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'x-csrf-token'],
    }),
  );

  // Parsing body dengan batas ukuran (100 KB).
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  // Logging HTTP (dilewati saat test agar output bersih).
  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === '/api/health',
        },
        redact: ['req.headers.cookie', 'req.headers.authorization'],
      }),
    );
  }

  // Session
  app.use(createSessionMiddleware());

  const api = express.Router();

  // Health (tanpa rate limit ketat)
  api.use('/health', healthRouter);

  // Rate limit umum untuk API
  api.use(apiLimiter);

  // Beranda
  api.get(
    '/home',
    asyncHandler(async (_req, res) => {
      const data = await getHomeData();
      sendSuccess(res, data);
    }),
  );

  // Publik
  api.use('/movies', publicMovieRouter);
  api.use('/categories', publicCategoryRouter);
  api.use('/settings', publicSettingsRouter);

  // Auth
  api.use('/auth', authRouter);

  // Admin
  api.use('/admin/movies', adminMovieRouter);
  api.use('/admin/categories', adminCategoryRouter);
  api.use('/admin/dashboard', adminDashboardRouter);
  api.use('/admin/settings', adminSettingsRouter);
  api.use('/admin/account', adminAccountRouter);

  app.use('/api', api);

  // 404 & error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
