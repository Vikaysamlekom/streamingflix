import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdSlot } from './AdSlot';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

/**
 * Iklan interstitial (overlay penuh).
 *
 * Muncul saat user mengklik poster film (/movies/...) atau tombol
 * "Putar Sekarang" (/watch/...), SEBELUM pindah halaman. Setelah user
 * menekan "Lewati"/"Lanjutkan", navigasi dilanjutkan ke tujuan awal.
 *
 * - Jeda minimal antar tampilan: 60 detik (sessionStorage) agar tidak
 *   mengganggu user yang sedang menjelajah katalog.
 * - Tanpa kode iklan di pengaturan → tidak memasang listener apa pun
 *   (perilaku situs 100% seperti semula).
 * - Klik dengan modifier (Ctrl/Clik tengah/target=_blank) tidak disentuh.
 */

const COOLDOWN_MS = 60_000;
const SKIP_AFTER_MS = 5_000;
const STORAGE_KEY = 'streamflix:last-interstitial';
const TARGET_RE = /^\/(movies|watch)\//;

function readLastShown(): number {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY) ?? '0');
  } catch {
    return 0;
  }
}

function writeLastShown(t: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(t));
  } catch {
    /* storage penuh/tidak tersedia — abaikan */
  }
}

export function AdInterstitial() {
  const { data: settings } = usePublicSettings();
  const navigate = useNavigate();
  const code = settings?.ads?.interstitial?.trim() ?? '';

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(
    Math.ceil(SKIP_AFTER_MS / 1000),
  );
  const pendingRef = useRef<string | null>(null);
  pendingRef.current = pendingHref;

  const proceed = useCallback(() => {
    const href = pendingRef.current;
    setPendingHref(null);
    if (href) navigate(href);
  }, [navigate]);

  // Pasang listener klik (capture) hanya bila kode iklan tersedia.
  useEffect(() => {
    if (!code) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (pendingRef.current) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.download) return;

      const href = anchor.getAttribute('href') ?? '';
      if (!href.startsWith('/') || !TARGET_RE.test(href)) return;

      // Cooldown antar tampilan.
      if (Date.now() - readLastShown() < COOLDOWN_MS) return;

      e.preventDefault();
      writeLastShown(Date.now());
      setRemaining(Math.ceil(SKIP_AFTER_MS / 1000));
      setPendingHref(href);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [code]);

  // Hitung mundur tombol Lewati.
  useEffect(() => {
    if (!pendingHref) return;
    setRemaining(Math.ceil(SKIP_AFTER_MS / 1000));
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = Math.ceil((SKIP_AFTER_MS - (Date.now() - startedAt)) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [pendingHref]);

  // Kunci scroll halaman belakang selama overlay terbuka.
  useEffect(() => {
    if (!pendingHref) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pendingHref]);

  // ESC = lanjut (aksesibilitas).
  useEffect(() => {
    if (!pendingHref) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') proceed();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pendingHref, proceed]);

  if (!code || !pendingHref) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Iklan"
    >
      <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Iklan
          </span>
          <button
            type="button"
            onClick={proceed}
            disabled={remaining > 0}
            className="rounded-[var(--radius-button)] border border-border px-3 py-1 text-sm text-text-secondary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {remaining > 0 ? `Lewati (${remaining})` : 'Lewati ✕'}
          </button>
        </div>

        <div className="flex min-h-[250px] items-center justify-center">
          <AdSlot
            code={code}
            name="interstitial"
            minHeight={250}
            className="flex w-full justify-center"
          />
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={proceed}
            className="text-sm text-accent transition hover:underline"
          >
            Lanjutkan ke film →
          </button>
        </div>
      </div>
    </div>
  );
}
