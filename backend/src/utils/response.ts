import type { Response } from 'express';

/** Amplop respons sukses (bagian 9 master prompt). */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

/** Amplop respons error. */
export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

/** Kirim respons sukses dengan amplop standar. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; meta?: SuccessEnvelope<T>['meta'] } = {},
): void {
  const { status = 200, meta } = options;
  const body: SuccessEnvelope<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  res.status(status).json(body);
}

/** Kirim respons sukses 201 (created). */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, { status: 201 });
}

/** Kirim respons 204 tanpa body. */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/** Kirim respons error dengan amplop standar. */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: { field: string; message: string }[],
): void {
  const body: ErrorEnvelope = details
    ? { success: false, error: { code, message, details } }
    : { success: false, error: { code, message } };
  res.status(status).json(body);
}
