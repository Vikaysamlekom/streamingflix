import { z } from 'zod';

/** Satu entri progres tontonan. */
export const progressEntrySchema = z.object({
  positionSec: z.number().min(0),
  durationSec: z.number().min(0),
  updatedAt: z.number(),
});

/** Peta slug -> entri progres. */
export const watchProgressSchema = z.record(z.string(), progressEntrySchema);

export type ProgressEntry = z.infer<typeof progressEntrySchema>;
export type WatchProgress = z.infer<typeof watchProgressSchema>;

/** Ambang selesai: >= 95% dianggap selesai. */
export const COMPLETION_THRESHOLD = 0.95;

/** Interval penyimpanan progres saat memutar (detik). */
export const SAVE_INTERVAL_SEC = 5;
