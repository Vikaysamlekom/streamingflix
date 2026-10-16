import { useCallback, useEffect, useRef, useState } from 'react';
import { useWatchProgress } from '@/features/watch-progress/use-watch-progress';
import { SAVE_INTERVAL_SEC } from '@/features/watch-progress/schema';

interface UseVideoProgressOptions {
  slug: string;
}

interface UseVideoProgressResult {
  /** Posisi tersimpan (detik) saat pertama kali dimuat, untuk resume. */
  resumePosition: number;
  hasResume: boolean;
  /** Panggil pada event loadedmetadata untuk menentukan posisi resume. */
  initFromDuration: (durationSec: number) => void;
  /** Simpan posisi saat ini (dipanggil berkala / saat pause / unload). */
  saveNow: (positionSec: number, durationSec: number) => void;
  clearResume: () => void;
}

/**
 * Mengelola progres tontonan untuk pemutar video:
 * - Membaca posisi terakhir dari localStorage (untuk resume).
 * - Menyimpan posisi secara berkala (dipanggil komponen dengan interval).
 * - Menyimpan saat halaman ditutup (beforeunload).
 */
export function useVideoProgress({
  slug,
}: UseVideoProgressOptions): UseVideoProgressResult {
  const { get, save } = useWatchProgress();
  const [resumePosition, setResumePosition] = useState(0);
  const [hasResume, setHasResume] = useState(false);

  const latestRef = useRef<{ position: number; duration: number }>({
    position: 0,
    duration: 0,
  });

  // Baca posisi tersimpan sekali saat mount.
  useEffect(() => {
    const entry = get(slug);
    if (entry && entry.positionSec > 5) {
      setResumePosition(entry.positionSec);
      setHasResume(true);
    } else {
      setResumePosition(0);
      setHasResume(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const initFromDuration = useCallback(
    (durationSec: number) => {
      const entry = get(slug);
      if (entry && entry.positionSec > 5 && durationSec > 0) {
        // Jangan resume bila sudah mendekati akhir.
        if (entry.positionSec < durationSec - 5) {
          setResumePosition(entry.positionSec);
          setHasResume(true);
          return;
        }
      }
      setResumePosition(0);
      setHasResume(false);
    },
    [get, slug],
  );

  const saveNow = useCallback(
    (positionSec: number, durationSec: number) => {
      latestRef.current = { position: positionSec, duration: durationSec };
      if (!durationSec || durationSec <= 0) return;
      save(slug, positionSec, durationSec);
    },
    [save, slug],
  );

  const clearResume = useCallback(() => setHasResume(false), []);

  // Simpan saat halaman ditutup / disembunyikan.
  useEffect(() => {
    const persist = () => {
      const { position, duration } = latestRef.current;
      if (duration > 0) save(slug, position, duration);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      persist();
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [save, slug]);

  return { resumePosition, hasResume, initFromDuration, saveNow, clearResume };
}

/** Interval penyimpanan progres (ms), diekspor untuk komponen pemutar. */
export const SAVE_INTERVAL_MS = SAVE_INTERVAL_SEC * 1000;
