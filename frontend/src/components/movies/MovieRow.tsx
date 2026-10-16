import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MovieRowProps {
  title: string;
  /** Aksi opsional di kanan judul (mis. tautan "Lihat semua") */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Baris konten horizontal yang bisa digeser.
 * Tombol panah kiri/kanan muncul di desktop; di mobile cukup swipe.
 */
export function MovieRow({ title, action, children, className }: MovieRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateArrows, children]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section className={cn('group/row', className)}>
      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <h2 className="text-lg font-bold tracking-tight text-text-primary sm:text-xl">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {action}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label={`Geser ${title} ke kiri`}
              className="rounded-full border border-border bg-surface/80 p-1.5 text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label={`Geser ${title} ke kanan`}
              className="rounded-full border border-border bg-surface/80 p-1.5 text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateArrows}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4"
      >
        {children}
      </div>
    </section>
  );
}
