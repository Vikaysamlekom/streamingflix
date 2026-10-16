import type {
  ApiError,
  ApiSuccess,
  PaginationMeta,
} from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

/** Error yang dilempar oleh API client, membawa kode & detail dari backend. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: { field: string; message: string }[];

  constructor(
    message: string,
    code: string,
    status: number,
    details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Kirim header CSRF (wajib untuk request admin yang mengubah data). */
  csrf?: boolean;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Menyimpan token CSRF yang diperoleh dari GET /api/auth/csrf-token.
 * Token disimpan di memory, bukan localStorage (keamanan).
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiRequestError(
      'Gagal mengambil token CSRF',
      'CSRF_FETCH_FAILED',
      res.status,
    );
  }
  const json = (await res.json()) as ApiSuccess<{ csrfToken: string }>;
  csrfToken = json.data.csrfToken;
  return csrfToken;
}

export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

function buildUrl(
  path: string,
  query?: RequestOptions['query'],
): string {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Fungsi inti pemanggil API.
 * - Menyertakan `credentials: 'include'` agar cookie sesi terkirim.
 * - Menyertakan header `x-csrf-token` untuk request yang mengubah data.
 * - Menormalkan bentuk respons & melempar ApiRequestError saat gagal.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: PaginationMeta }> {
  const { method = 'GET', body, csrf = false, signal, query } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (csrf) {
    const token = await ensureCsrfToken();
    headers['x-csrf-token'] = token;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiRequestError(
      'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      'NETWORK_ERROR',
      0,
    );
  }

  // 204 No Content (mis. DELETE)
  if (res.status === 204) {
    return { data: undefined as T };
  }

  let json: unknown;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiRequestError(
      'Respons server tidak valid',
      'INVALID_RESPONSE',
      res.status,
    );
  }

  if (!res.ok) {
    const errorBody = json as ApiError;
    const message =
      errorBody?.error?.message ?? `Permintaan gagal (${res.status})`;
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR';
    const details = errorBody?.error?.details;

    // Token CSRF kedaluwarsa/tidak valid -> reset agar diambil ulang.
    if (res.status === 403 && code === 'CSRF_INVALID') {
      csrfToken = null;
    }

    throw new ApiRequestError(message, code, res.status, details);
  }

  const successBody = json as ApiSuccess<T>;
  return { data: successBody.data, meta: successBody.meta };
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body, csrf: true }),
  /**
   * POST publik tanpa header CSRF (mis. pencatatan view).
   * Dipakai untuk endpoint publik yang tidak memerlukan sesi,
   * agar tidak membuat sesi anonim di server.
   */
  postPublic: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body, csrf: false }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body, csrf: true }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body, csrf: true }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE', csrf: true }),
};
