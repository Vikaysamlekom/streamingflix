import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import {
  validateRequest,
  getValidBody,
} from '../../middlewares/validate-request';
import { requireAdmin } from '../../middlewares/require-admin';
import { csrfProtect } from '../../middlewares/csrf';
import { writeLimiter } from '../../middlewares/rate-limit';
import { changePasswordSchema, type ChangePasswordInput } from './auth.schema';
import * as service from './auth.service';
import { AppError } from '../../utils/app-error';

/** GET/PUT /api/admin/account — pengaturan akun admin yang sedang login. */
export const adminAccountRouter = Router();

adminAccountRouter.use(requireAdmin());
adminAccountRouter.use(csrfProtect());

// PUT /api/admin/account/password
adminAccountRouter.put(
  '/password',
  writeLimiter,
  validateRequest({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const body = getValidBody<ChangePasswordInput>(req);
    const adminId = req.session.adminId;
    if (typeof adminId !== 'number') throw AppError.unauthorized();
    await service.changePassword(adminId, body);
    sendSuccess(res, { ok: true });
  }),
);
