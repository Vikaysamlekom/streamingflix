import { ERROR_CODES, ERROR_MESSAGES } from './error-code';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * AppError: error aplikasi dengan kode & status HTTP yang terdefinisi.
 * Pesan yang dibawa aman dikirim ke klien (tanpa detail internal).
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: FieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: FieldError[],
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Pertahankan stack trace untuk logging internal.
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(
    message = ERROR_MESSAGES[ERROR_CODES.BAD_REQUEST],
    code: string = ERROR_CODES.BAD_REQUEST,
  ) {
    return new AppError(400, code, message);
  }

  static unauthorized(
    message = ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
    code: string = ERROR_CODES.UNAUTHORIZED,
  ) {
    return new AppError(401, code, message);
  }

  static forbidden(
    message = ERROR_MESSAGES[ERROR_CODES.FORBIDDEN],
    code: string = ERROR_CODES.FORBIDDEN,
  ) {
    return new AppError(403, code, message);
  }

  static notFound(message = ERROR_MESSAGES[ERROR_CODES.NOT_FOUND]) {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(
    message = ERROR_MESSAGES[ERROR_CODES.CONFLICT],
    code: string = ERROR_CODES.CONFLICT,
  ) {
    return new AppError(409, code, message);
  }

  static validation(
    message = ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
    details?: FieldError[],
  ) {
    return new AppError(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static tooMany(
    message = ERROR_MESSAGES[ERROR_CODES.RATE_LIMITED],
    code: string = ERROR_CODES.RATE_LIMITED,
  ) {
    return new AppError(429, code, message);
  }

  static internal(
    message = ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    code: string = ERROR_CODES.INTERNAL_ERROR,
  ) {
    return new AppError(500, code, message);
  }

  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
  }
}
