/**
 * Utilitas format tampilan (tanggal, durasi, angka, dll.).
 */

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}j ${m}m`;
  if (h > 0) return `${h}j`;
  return `${m}m`;
}

/** Format detik ke mm:ss atau h:mm:ss */
export function formatTimecode(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}Jt`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}rb`;
  return String(count);
}

export function formatNumber(count: number): string {
  return new Intl.NumberFormat('id-ID').format(count);
}

export function formatDate(
  input: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!input) return '-';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(input: string | Date | null | undefined): string {
  return formatDate(input, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Persentase 0-100 dari posisi/durasi */
export function percent(position: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (position / duration) * 100));
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
