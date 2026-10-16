import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { SAVE_INTERVAL_MS, useVideoProgress } from './hooks/use-video-progress';
import { Button } from '@/components/ui/Button';
import { formatTimecode } from '@/utils/format';

interface VideoPlayerProps {
  slug: string;
  title: string;
  src: string;
  posterUrl?: string | null;
  /** Dipanggil sekali saat video benar-benar mulai diputar (untuk tracking view). */
  onStarted?: () => void;
}

/**
 * Pemutar video HTML5 dengan:
 * - indikator loading saat `loadstart`/`waiting`,
 * - resume dari posisi terakhir dengan opsi "Mulai dari awal",
 * - penyimpanan progres berkala (setiap 5 detik) dan saat pause/keluar,
 * - penandaan selesai otomatis (>= 95%),
 * - error state dengan tombol "Coba Lagi".
 */
export function VideoPlayer({
  slug,
  title,
  src,
  posterUrl,
  onStarted,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const startedRef = useRef(false);
  const { initFromDuration, saveNow, hasResume, resumePosition } =
    useVideoProgress({ slug });

  // Muat ulang saat sumber berubah (mis. Coba Lagi).
  useEffect(() => {
    setError(false);
    setLoading(true);
    setResumeAt(null);
  }, [src]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    initFromDuration(video.duration);
    if (hasResume && resumePosition > 5 && resumePosition < video.duration - 5) {
      video.currentTime = resumePosition;
      setResumeAt(resumePosition);
    }
  };

  const restart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setResumeAt(null);
    void video.play().catch(() => {
      /* autoplay dapat diblokir; abaikan */
    });
  }, []);

  // Simpan progres berkala selama diputar.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const interval = window.setInterval(() => {
      if (!video.paused && !video.ended && video.duration > 0) {
        saveNow(video.currentTime, video.duration);
      }
    }, SAVE_INTERVAL_MS);

    const onPause = () => {
      if (video.duration > 0) saveNow(video.currentTime, video.duration);
    };
    const onEnded = () => {
      if (video.duration > 0) saveNow(video.duration, video.duration);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    return () => {
      window.clearInterval(interval);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [saveNow, src]);

  const handlePlay = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      onStarted?.();
    }
    setResumeAt(null);
  };

  if (error) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center">
        <AlertTriangle className="size-10 text-warning" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-text-primary">
            Video tidak dapat diputar
          </p>
          <p className="mt-1 max-w-md text-sm text-text-muted">
            Maaf, sumber video “{title}” tidak tersedia saat ini. Sumber dapat
            gagal, memblokir hotlink, atau tidak mendukung pemutaran langsung.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw className="size-4" />}
          onClick={() => {
            setError(false);
            setLoading(true);
            videoRef.current?.load();
          }}
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-black">
      {/* Overlay indikator loading */}
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <Loader2 className="size-9 animate-spin text-accent" aria-hidden="true" />
          <span className="sr-only">Memuat video…</span>
        </div>
      ) : null}

      {/* Banner resume */}
      {resumeAt !== null ? (
        <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
          <span>Melanjutkan dari {formatTimecode(resumeAt)}</span>
          <button
            type="button"
            onClick={restart}
            className="rounded-full bg-white/15 px-2.5 py-1 font-semibold transition-colors hover:bg-white/25"
          >
            Mulai dari awal
          </button>
        </div>
      ) : null}

      <video
        ref={videoRef}
        src={src}
        poster={posterUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onLoadStart={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={handlePlay}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      >
        Peramban Anda tidak mendukung pemutar video HTML5.
      </video>
    </div>
  );
}
