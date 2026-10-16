import { Router } from 'express';
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
  categoryPayloadSchema,
  categoryIdParamsSchema,
  categorySlugParamsSchema,
  categoryMoviesQuerySchema,
  type CategoryPayload,
  type CategoryMoviesQuery,
} from './category.schema';
import * as service from './category.service';

/* --------------------------- Route publik ----------------------------- */

export const publicCategoryRouter = Router();

// GET /api/categories
publicCategoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await service.listPublic();
    sendSuccess(res, categories);
  }),
);

// GET /api/categories/:slug/movies
publicCategoryRouter.get(
  '/:slug/movies',
  validateRequest({
    params: categorySlugParamsSchema,
    query: categoryMoviesQuerySchema,
  }),
  asyncHandler(async (req, res) => {
    const { slug } = getValidParams<{ slug: string }>(req);
    const query = getValidQuery<CategoryMoviesQuery>(req);
    const result = await service.getMoviesByCategory(slug, query);
    sendSuccess(res, { category: result.category, movies: result.items }, {
      meta: result.meta,
    });
  }),
);

/* ---------------------------- Route admin ----------------------------- */

export const adminCategoryRouter = Router();

adminCategoryRouter.use(requireAdmin());
adminCategoryRouter.use(csrfProtect());

// GET /api/admin/categories
adminCategoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await service.listAdmin();
    sendSuccess(res, categories);
  }),
);

// POST /api/admin/categories
adminCategoryRouter.post(
  '/',
  writeLimiter,
  validateRequest({ body: categoryPayloadSchema }),
  asyncHandler(async (req, res) => {
    const payload = getValidBody<CategoryPayload>(req);
    const category = await service.create(payload);
    sendCreated(res, category);
  }),
);

// PUT /api/admin/categories/:id
adminCategoryRouter.put(
  '/:id',
  writeLimiter,
  validateRequest({ params: categoryIdParamsSchema, body: categoryPayloadSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    const payload = getValidBody<CategoryPayload>(req);
    const category = await service.update(id, payload);
    sendSuccess(res, category);
  }),
);

// DELETE /api/admin/categories/:id
adminCategoryRouter.delete(
  '/:id',
  writeLimiter,
  validateRequest({ params: categoryIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getValidParams<{ id: number }>(req);
    await service.remove(id);
    sendNoContent(res);
  }),
);
