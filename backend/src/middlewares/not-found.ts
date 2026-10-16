import type { Request, Response } from 'express';
import { sendError } from '../utils/response';
import { ERROR_CODES } from '../utils/error-code';

/** Middleware untuk route yang tidak ditemukan (404). */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    404,
    ERROR_CODES.NOT_FOUND,
    `Endpoint tidak ditemukan: ${req.method} ${req.path}`,
  );
}
