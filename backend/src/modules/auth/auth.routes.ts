import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import {
  validateRequest,
  getValidBody,
} from '../../middlewares/validate-request';
import { requireAdmin } from '../../middlewares/require-admin';
import { loginLimiter } from '../../middlewares/rate-limit';
import { csrfProtect, issueCsrfToken } from '../../middlewares/csrf';
import { loginSchema, type LoginInput } from './auth.schema';
import * as service from './auth.service';
import { AppError } from '../../utils/app-error';

/**
 * Autentikasi admin (session-based).
 * - Login: rate-limited ketat, pesan gagal generik.
 * - Logout: wajib CSRF + sesi admin.
 */
export const authRouter = Router();

// GET /api/auth/csrf-token
authRouter.get(
  '/csrf-token',
  asyncHandler(async (req, res) => {
    const csrfToken = issueCsrfToken(req);
    sendSuccess(res, { csrfToken });
  }),
);

// POST /api/auth/login
authRouter.post(
  '/login',
  loginLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const body = getValidBody<LoginInput>(req);
    const { admin, csrfToken } = await service.login(req, body);
    sendSuccess(res, { admin, csrfToken });
  }),
);

// POST /api/auth/logout
authRouter.post(
  '/logout',
  csrfProtect(),
  asyncHandler(async (req, res) => {
    await service.logout(req);
    sendSuccess(res, { ok: true });
  }),
);

// GET /api/auth/me
authRouter.get(
  '/me',
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const adminId = req.session.adminId;
    if (typeof adminId !== 'number') throw AppError.unauthorized();
    const admin = await service.getMe(adminId);
    sendSuccess(res, { admin });
  }),
);
