import { useCallback, useEffect, useState } from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '@/utils/storage';
import {
  COMPLETION_THRESHOLD,
  watchProgressSchema,
  type ProgressEntry,
  type WatchProgress,
} from './schema';

/**
 * Hook Lanjutkan Menonton (progres tontonan di localStorage).
 * Data divalidasi dengan Zod saat dibaca.
 */
export function useWatchProgress() {
  const [progress, setProgress] = useState<WatchProgress>(() => {
    const parsed = watchProgressSchema.safeParse(
      readJson<unknown>(STORAGE_KEYS.watchProgress, {}),
    );
    return parsed.success ? parsed.data : {};
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.watchProgress) return;
      const parsed = watchProgressSchema.safeParse(
        readJson<unknown>(STORAGE_KEYS.watchProgress, {}),
      );
      setProgress(parsed.success ? parsed.data : {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback(
    (slug: string, positionSec: number, durationSec: number) => {
      if (!durationSec || durationSec <= 0) return;

      setProgress((prev) => {
        // Jika sudah mencapai ambang selesai, hapus dari Lanjutkan Menonton.
        if (positionSec / durationSec >= COMPLETION_THRESHOLD) {
          if (!(slug in prev)) return prev;
          const next = { ...prev };
          delete next[slug];
          writeJson(STORAGE_KEYS.watchProgress, next);
          return next;
        }

        const entry: ProgressEntry = {
          positionSec,
          durationSec,
          updatedAt: Date.now(),
        };
        const next = { ...prev, [slug]: entry };
        writeJson(STORAGE_KEYS.watchProgress, next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((slug: string) => {
    setProgress((prev) => {
      if (!(slug in prev)) return prev;
      const next = { ...prev };
      delete next[slug];
      writeJson(STORAGE_KEYS.watchProgress, next);
      return next;
    });
  }, []);

  /** Buang entri yang filmnya sudah tidak ada di katalog. */
  const retainOnly = useCallback((validSlugs: string[]) => {
    setProgress((prev) => {
      const allowed = new Set(validSlugs);
      const next: WatchProgress = {};
      for (const [slug, entry] of Object.entries(prev)) {
        if (allowed.has(slug)) next[slug] = entry;
      }
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      writeJson(STORAGE_KEYS.watchProgress, next);
      return next;
    });
  }, []);

  const get = useCallback(
    (slug: string): ProgressEntry | undefined => progress[slug],
    [progress],
  );

  return { progress, save, remove, retainOnly, get };
}
