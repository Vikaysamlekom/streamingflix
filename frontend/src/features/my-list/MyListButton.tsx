import { Check, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMyList } from './use-my-list';
import { useToast } from '@/components/ui/Toast';

interface MyListButtonProps {
  slug: string;
  title?: string;
  /** Tampilan: 'icon' (untuk overlay kartu) atau 'full' (tombol berlabel). */
  variant?: 'icon' | 'full';
  className?: string;
}

/** Tombol tambah/hapus dari Daftar Saya (disimpan di localStorage). */
export function MyListButton({
  slug,
  title,
  variant = 'full',
  className,
}: MyListButtonProps) {
  const { has, toggle } = useMyList();
  const toast = useToast();
  const inList = has(slug);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(slug);
    toast.info(
      inList
        ? `Dihapus dari Daftar Saya${title ? `: ${title}` : ''}`
        : `Ditambahkan ke Daftar Saya${title ? `: ${title}` : ''}`,
    );
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={inList}
        aria-label={inList ? 'Hapus dari Daftar Saya' : 'Tambah ke Daftar Saya'}
        className={cn(
          'flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-sm transition-colors hover:border-accent hover:text-accent',
          inList && 'border-accent text-accent',
          className,
        )}
      >
        {inList ? <Check className="size-4" /> : <Plus className="size-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={inList}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] border px-5 text-sm font-semibold transition-colors',
        inList
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-surface-elevated text-text-primary hover:border-accent hover:text-accent',
        className,
      )}
    >
      {inList ? <Check className="size-5" /> : <Plus className="size-5" />}
      {inList ? 'Ada di Daftar Saya' : 'Daftar Saya'}
    </button>
  );
}
