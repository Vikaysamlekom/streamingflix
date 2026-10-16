import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import { requireAdmin } from '../../middlewares/require-admin';
import { getPool } from '../../config/database';
import { attachCategoriesForRows } from '../movies/movie.repository';

const SUMMARY_COLUMNS = `
  id, title, slug, poster_url, banner_url, release_year,
  duration_minutes, rating, age_rating, view_count, published_at
`;

/** GET /api/admin/dashboard/stats */
export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAdmin());

adminDashboardRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [summaryResult, recentResult, topResult, categoryResult] =
      await Promise.all([
        getPool().query<RowDataPacket[]>(
          `SELECT
             COUNT(*) AS totalMovies,
             COALESCE(SUM(status = 'published'), 0) AS publishedMovies,
             COALESCE(SUM(status = 'draft'), 0) AS draftMovies,
             COALESCE(SUM(is_featured = 1), 0) AS featuredMovies,
             COALESCE(SUM(view_count), 0) AS totalViews
           FROM movies`,
        ),
        getPool().query<RowDataPacket[]>(
          `SELECT ${SUMMARY_COLUMNS} FROM movies ORDER BY updated_at DESC LIMIT 5`,
        ),
        getPool().query<RowDataPacket[]>(
          `SELECT ${SUMMARY_COLUMNS} FROM movies ORDER BY view_count DESC LIMIT 5`,
        ),
        getPool().query<RowDataPacket[]>(
          'SELECT COUNT(*) AS c FROM categories',
        ),
      ]);

    const summary = (summaryResult[0][0] ?? {}) as Record<string, unknown>;
    const recent = await attachCategoriesForRows(recentResult[0]);
    const topViewed = await attachCategoriesForRows(topResult[0]);

    sendSuccess(res, {
      totalMovies: Number(summary.totalMovies ?? 0),
      publishedMovies: Number(summary.publishedMovies ?? 0),
      draftMovies: Number(summary.draftMovies ?? 0),
      totalCategories: Number(
        (categoryResult[0][0] as { c: number } | undefined)?.c ?? 0,
      ),
      featuredMovies: Number(summary.featuredMovies ?? 0),
      totalViews: Number(summary.totalViews ?? 0),
      recentlyUpdated: recent,
      topViewed,
    });
  }),
);
