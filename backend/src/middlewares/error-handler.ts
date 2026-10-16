import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/error-code';
import { logger } from '../utils/logger';
import { zodErrorToDetails } from './validate-request';
import { sendError } from '../utils/response';

/** Error dari MySQL dengan kode errno. */
interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

/** Cek apakah error berasal dari duplikasi MySQL (ER_DUP_ENTRY = 1062). */
function isDuplicateKeyError(err: unknown): err is MysqlError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as MysqlError).errno === 1062
  );
}

/** Cek apakah error berasal dari pelanggaran foreign key (ER_ROW_IS_REFERENCED = 1451/1452). */
function isForeignKeyError(err: unknown): err is MysqlError {
  const errno = (err as MysqlError)?.errno;
  return errno === 1451 || errno === 1452;
}

/**
 * Error handling terpusat.
 * - AppError -> response sesuai status & kode.
 * - ZodError -> 422 VALIDATION_ERROR dengan detail per field.
 * - MySQL duplicate -> 409.
 * - MySQL foreign key -> 409 (kebijakan hapus).
 * - Error lain -> 500 tanpa membocorkan stack trace ke klien.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Jika response sudah terkirim, delegasikan ke Express default.
  if (res.headersSent) {
    next(err);
    return;
  }

  // AppError
  if (AppError.isAppError(err)) {
    // Log sebagai warn untuk client error, error untuk server error.
    if (err.status >= 500) {
      logger.error(
        { err, status: err.status, code: err.code, path: req.path },
        'AppError',
      );
    } else {
      logger.warn(
        { status: err.status, code: err.code, path: req.path },
        'AppError (client)',
      );
    }

    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  // ZodError (jika lolos middleware validasi)
  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues, path: req.path }, 'ZodError');
    sendError(
      res,
      422,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
      zodErrorToDetails(err),
    );
    return;
  }

  // MySQL duplicate key -> 409 slug bentrok
  if (isDuplicateKeyError(err)) {
    logger.warn({ path: req.path, errno: err.errno }, 'Duplicate key error');
    sendError(res, 409, ERROR_CODES.SLUG_TAKEN, ERROR_MESSAGES[ERROR_CODES.SLUG_TAKEN]);
    return;
  }

  // MySQL foreign key -> 409 kategori terpakai
  if (isForeignKeyError(err)) {
    logger.warn({ path: req.path, errno: err.errno }, 'Foreign key error');
    sendError(
      res,
      409,
      ERROR_CODES.CATEGORY_IN_USE,
      ERROR_MESSAGES[ERROR_CODES.CATEGORY_IN_USE],
    );
    return;
  }

  // Syntax error JSON body (bad-json)
  if (
    typeof err === 'object' &&
    err !== null &&
    (err as Error).name === 'SyntaxError' &&
    'body' in (err as object)
  ) {
    logger.warn({ path: req.path }, 'Invalid JSON body');
    sendError(
      res,
      400,
      ERROR_CODES.BAD_REQUEST,
      'Format JSON tidak valid',
    );
    return;
  }

  // Error tak dikenal -> 500, jangan bocorkan stack trace ke klien.
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  const message = ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR];

  // Detail tambahan hanya di mode non-produksi (untuk debugging),
  // dan tidak pernah berisi stack trace/kredensial.
  sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, message);
}
