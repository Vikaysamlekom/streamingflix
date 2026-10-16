import type { Request, RequestHandler, Response } from 'express';

/**
 * Membungkus async route handler agar error otomatis diteruskan
 * ke Express error-handling middleware (next(err)).
 * Menangani kasus umum di mana Express tidak otomatis memanggil next
 * untuk handler async yang melempar error.
 */
type AsyncHandler = (req: Request, res: Response) => Promise<void> | void;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}
