import { useState } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PosterProps {
  src?: string | null;
  alt: string;
  /** Judul untuk placeholder gradient bila poster tidak ada */
  title: string;
  className?: string;
  /** Rasio aspek, default 2:3 (poster potret) */
  aspect?: '2/3' | '16/9' | '1/1';
}

const aspectClass = {
  '2/3': 'aspect-[2/3]',
  '16/9': 'aspect-video',
  '1/1': 'aspect-square',
} as const;

/** Hash string -> hue warna untuk placeholder gradient deterministik. */
function hueFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Menampilkan poster film. Bila URL kosong atau gagal dimuat,
 * tampilkan placeholder gradient + judul (dibuat sendiri, bukan gambar berhak cipta).
 */
export function Poster({ src, alt, title, className, aspect = '2/3' }: PosterProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;
  const hue = hueFromString(title);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-card)] bg-surface-elevated',
        aspectClass[aspect],
        className,
      )}
    >
      {showPlaceholder ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center"
          style={{
            backgroundImage: `linear-gradient(135deg, hsl(${hue} 45% 18%), hsl(${(hue + 40) % 360} 55% 10%))`,
          }}
        >
          <Film className="size-7 text-white/40" aria-hidden="true" />
          <span className="line-clamp-3 text-xs font-semibold text-white/80 sm:text-sm">
            {title}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
