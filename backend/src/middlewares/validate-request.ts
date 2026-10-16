import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/error-code';

/**
 * Validasi input dengan Zod untuk body, query, dan params.
 * Hasil tervalidasi disimpan pada `req.valid` agar handler memakai data bersih.
 */

interface ValidStore {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export interface ValidatedSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validateRequest(schemas: ValidatedSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const valid: ValidStore = {};

      if (schemas.params) {
        valid.params = parseOrThrow(schemas.params, req.params, 'param');
      }
      if (schemas.query) {
        valid.query = parseOrThrow(schemas.query, req.query, 'query');
      }
      if (schemas.body) {
        valid.body = parseOrThrow(schemas.body, req.body ?? {}, 'body');
      }

      (req as Request & { valid?: ValidStore }).valid = valid;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function parseOrThrow(
  schema: ZodTypeAny,
  data: unknown,
  location: 'body' | 'query' | 'param',
): unknown {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details = zodErrorToDetails(result.error);
  const locationLabel =
    location === 'body' ? 'data' : location === 'param' ? 'parameter' : 'query';
  throw AppError.validation(
    `${ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR]} pada ${locationLabel}`,
    details,
  );
}

export function zodErrorToDetails(
  error: ZodError,
): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : '_',
    message: issue.message,
  }));
}

function store(req: Request): ValidStore {
  const valid = (req as Request & { valid?: ValidStore }).valid;
  if (!valid) {
    throw AppError.internal('Validasi tidak berjalan untuk request ini');
  }
  return valid;
}

export function getValidBody<T>(req: Request): T {
  return store(req).body as T;
}

export function getValidQuery<T>(req: Request): T {
  return store(req).query as T;
}

export function getValidParams<T>(req: Request): T {
  return store(req).params as T;
}
