import { randomBytes } from 'crypto';

/**
 * Membuat slug dari judul (deterministik, lowercase, ASCII-safe).
 * Karakter non-ASCII / diacritics dinormalisasi dan dipetakan.
 */
export function slugify(input: string): string {
  const result = input
    .toLowerCase()
    .normalize('NFKD')
    // hapus combining marks / diacritics
    .replace(/[\u0300-\u036f]/g, '')
    // eslint-disable-next-line no-control-regex -- sengaja mencocokkan rentang ASCII untuk membuang non-ASCII
    .replace(/[^\x00-\x7F]/g, '') // buang sisa karakter non-ASCII
    .replace(/[^a-z0-9\s-]/g, '') // buang karakter tak diinginkan
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return result;
}

/**
 * Memastikan slug tidak kosong; bila kosong, buat suffix acak.
 * Pemeriksaan duplikat sebenarnya dilakukan di repository (jalan ganda).
 */
export function uniqueSlug(base: string): string {
  const slug = slugify(base);
  if (slug) return slug;
  return `film-${randomBytes(3).toString('hex')}`;
}

/** Validasi format slug yang diterima. */
export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 255;
}
