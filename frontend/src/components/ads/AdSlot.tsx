import { useEffect, useRef } from 'react';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

/**
 * Sisipkan HTML kode iklan ke dalam container dan eksekusi script-nya.
 *
 * `innerHTML`/`dangerouslySetInnerHTML` TIDAK mengeksekusi <script>, jadi
 * setiap script dibuat ulang dengan createElement lalu di-append — cara ini
 * yang membuat kode iklan (Adsterra, dll.) benar-benar berjalan.
 */
function injectHtml(container: HTMLElement, html: string): void {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  for (const node of Array.from(temp.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
      const old = node as HTMLScriptElement;
      const script = document.createElement('script');
      for (const attr of Array.from(old.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      if (old.src) {
        // Pertahankan urutan eksekusi antar script eksternal.
        if (!old.hasAttribute('async')) script.async = false;
      } else {
        script.textContent = old.textContent;
      }
      container.appendChild(script);
    } else {
      container.appendChild(document.importNode(node, true));
    }
  }
}

interface AdSlotProps {
  /** Kode HTML iklan dari pengaturan (kosong = slot tidak dirender). */
  code?: string;
  /** Posisi slot — dipakai untuk data-ad-slot & debug. */
  name: string;
  className?: string;
  minHeight?: number;
}

/**
 * Slot iklan pada halaman publik. Tidak dirender apa pun bila kode kosong,
 * sehingga tampilan situs tetap rapi sebelum iklan dikonfigurasi.
 */
export function AdSlot({ code, name, className, minHeight = 90 }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = code?.trim() ?? '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    if (!html) return;

    injectHtml(container, html);

    return () => {
      container.replaceChildren();
    };
  }, [html]);

  if (!html) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight }}
      data-ad-slot={name}
      aria-label={`Iklan: ${name}`}
    />
  );
}

/**
 * Slot iklan berdasar pengaturan publik — cukup sebutkan posisinya.
 * Contoh: <AdSlotFromSettings position="homeTop" />
 */
export function AdSlotFromSettings({
  position,
  ...props
}: { position: 'homeTop' | 'homeMid' | 'watchBelow' | 'detailBelow' } & Omit<AdSlotProps, 'code' | 'name'>) {
  const { data: settings } = usePublicSettings();
  return <AdSlot code={settings?.ads?.[position]} name={position} {...props} />;
}

interface AdHeaderCodeProps {
  code?: string;
}

/** Script iklan tingkat halaman (mis. social bar/push) — disuntik ke <head> sekali. */
export function AdHeaderCode({ code }: AdHeaderCodeProps) {
  const html = code?.trim() ?? '';
  const lastInjected = useRef<string | null>(null);

  useEffect(() => {
    if (lastInjected.current === html) return;

    // Lepas script lama bila kode berubah.
    document.head
      .querySelectorAll('script[data-streamflix-ad-header]')
      .forEach((s) => s.remove());

    lastInjected.current = html;
    if (!html) return;

    // Sisipkan langsung ke <head> (tanpa kontainer sementara agar script
    // eksternal tidak berpindah node saat masih dimuat).
    const temp = document.createElement('div');
    temp.innerHTML = html;
    for (const node of Array.from(temp.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
        const old = node as HTMLScriptElement;
        const script = document.createElement('script');
        for (const attr of Array.from(old.attributes)) {
          script.setAttribute(attr.name, attr.value);
        }
        if (old.src) {
          if (!old.hasAttribute('async')) script.async = false;
        } else {
          script.textContent = old.textContent;
        }
        script.setAttribute('data-streamflix-ad-header', '');
        document.head.appendChild(script);
      } else {
        document.head.appendChild(document.importNode(node, true));
      }
    }
  }, [html]);

  return null;
}
