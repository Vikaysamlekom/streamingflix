import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import {
  validateRequest,
  getValidBody,
  getValidQuery,
  getValidParams,
} from '../../middlewares/validate-request';
import { requireAdmin } from '../../middlewares/require-admin';
import { csrfProtect } from '../../middlewares/csrf';
import { writeLimiter } from '../../middlewares/rate-limit';
import {
  movieListQuerySchema,
  adminMovieListQuerySchema,
  movieSlugParamsSchema,
  movieIdParamsSchema,
  moviePayloadSchema,
  movieStatusSchema,
  movieSlugsQuerySchema,
  type MovieListQuery,
  type AdminMovieListQuery,
  type MoviePayload,
} from './movie.schema';
import * as service from './movie.service';

/* --------------------------- Route publik ----------------------------- */

export const publicMovieRouter = Router();

// GET /api/movies
publicMovieRouter.get(
  '/',
  validateRequest({ query: movieListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = getValidQuery<MovieListQuery>(req);
    const { items, meta } = await service.listPublic(query);
    sendSuccess(res, items, { meta });
  }),
);

// GET /api/movies/by-slugs?slugs=a,b,c
// Harus didaftarkan SEBELUM '/:slug' agar tidak tertangkap sebagai slug.
publicMovieRouter.get(
  '/by-slugs',
  validateRequest({ query: movieSlugsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = getValidQuery<{ slugs: string[] }>(req);
    const items = await service.getSummariesBySlugs(query.slugs);
    sendSuccess(res, items);
  }),
);

// POST /api/movies/:slug/view  (rate limit per IP)
const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan.' },
  },
});

publicMovieRouter.post(
  '/:slug/view',
  viewLimiter,
  validateRequest({ params: movieSlugParamsSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getValidParams<{ slug: string }>(req);
    await service.recordView(slug);
    sendSuccess(res, { recorded: true });
  }),
);

// GET /api/movies/:slug
publicMovieRouter.get(
  '/:slug',
  validateRequest({ params: movieSlugParamsSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getValidParams<{ slug: string }>(req);
    const movie = await service.getPublicDetail(slug);
    sendSuccess(res, movie);
  }),
);

/* ---------------------------- Route admin ----------------------------- */

export const adminMovieRouter = Router();

adminMovieRouter.use(requireAdmin());
adminMovieRouter.use(csrfProtect());

// GET /api/admin/movies
adminMovieRouter.get(
  '/',
  validateRequest({ query: adminMovieListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = getValidQuery<AdminMovieListQuery>(req);
    const { items, meta } = await service.adminList(query);
    sendSuccess(res, items, { meta });
  }),
);

// POST /api/admin/movies
adminMovieRouter.post(
  '/',
  writeLimiter,
  validateRequest({ body: moviePayloadSchema }),
  asyncHandler(async (req, res) => {
    const payload = getValidBody<MoviePayload>(req);
    const movie = await service.adminCreate(payload);
    sendCreated(res, movie);
  }),
);

// GET /api/admin/movies/:id
adminMovieRouter.get(
  '/:id',
  validateRequest({ params: movieIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    const movie = await service.adminGet(id);
    sendSuccess(res, movie);
  }),
);

// PUT /api/admin/movies/:id
adminMovieRouter.put(
  '/:id',
  writeLimiter,
  validateRequest({ params: movieIdParamsSchema, body: moviePayloadSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    const payload = getValidBody<MoviePayload>(req);
    const movie = await service.adminUpdate(id, payload);
    sendSuccess(res, movie);
  }),
);

// PATCH /api/admin/movies/:id/status
adminMovieRouter.patch(
  '/:id/status',
  writeLimiter,
  validateRequest({ params: movieIdParamsSchema, body: movieStatusSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    const { status } = getValidBody<{ status: 'draft' | 'published' }>(req);
    const movie = await service.adminUpdateStatus(id, status);
    sendSuccess(res, movie);
  }),
);

// DELETE /api/admin/movies/:id
adminMovieRouter.delete(
  '/:id',
  writeLimiter,
  validateRequest({ params: movieIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    await service.adminDelete(id);
    sendNoContent(res);
  }),
);
