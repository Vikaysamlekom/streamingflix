/**
 * Pembungkus aman untuk localStorage.
 * Akses dibungkus try/catch karena mode privat / penyimpanan penuh
 * tidak boleh membuat aplikasi error. Data divalidasi Zod di pemanggil.
 */

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

export const STORAGE_KEYS = {
  myList: 'streamflix:my-list',
  watchProgress: 'streamflix:watch-progress',
} as const;
