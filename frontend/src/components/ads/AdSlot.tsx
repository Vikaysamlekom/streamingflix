import { useEffect, useRef } from 'react';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

/** Batas waktu muat script eksternal agar rantai injeksi tidak tersendat. */
const SCRIPT_LOAD_TIMEOUT_MS = 8000;

/**
 * Sisipkan HTML kode iklan ke container dan eksekusi script-nya.
 *
 * `innerHTML`/`dangerouslySetInnerHTML` TIDAK mengeksekusi <script>, jadi
 * setiap script dibuat ulang dengan createElement lalu di-append — cara ini
 * yang membuat kode iklan (Adsterra, dll.) benar-benar berjalan.
 *
 * Penting: script eksternal DITUNGGU selesai sebelum node berikutnya
 * disisipkan. Jaringan iklan memakai pola global `atOptions` (inline) lalu
 * `invoke.js` (eksternal); tanpa penungguan ini, banner kedua akan menimpa
 * kode banner pertama dan kedua slot menampilkan unit yang sama.
 */
async function injectHtml(
  container: HTMLElement,
  html: string,
  isCancelled?: () => boolean,
): Promise<void> {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  for (const node of Array.from(temp.childNodes)) {
    if (isCancelled?.()) return;

    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
      const old = node as HTMLScriptElement;
      const script = document.createElement('script');
      for (const attr of Array.from(old.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }

      if (old.src) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve();
          };
          const timer = setTimeout(finish, SCRIPT_LOAD_TIMEOUT_MS);
          script.onload = finish;
          script.onerror = finish;
          if (isCancelled?.()) {
            finish();
            return;
          }
          container.appendChild(script);
        });
      } else {
        // Script inline: dieksekusi sinkron saat di-append.
        script.textContent = old.textContent;
        container.appendChild(script);
      }
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

    let cancelled = false;
    void injectHtml(container, html, () => cancelled);

    return () => {
      cancelled = true;
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

type AdPosition =
  | 'homeTop'
  | 'homeMid'
  | 'watchBelow'
  | 'detailTop'
  | 'detailBelow'
  | 'detailBottom'
  | 'interstitial';

/**
 * Slot iklan berdasar pengaturan publik — cukup sebutkan posisinya.
 * Contoh: <AdSlotFromSettings position="detailTop" />
 */
export function AdSlotFromSettings({
  position,
  ...props
}: { position: AdPosition } & Omit<AdSlotProps, 'code' | 'name'>) {
  const { data: settings } = usePublicSettings();
  return <AdSlot code={settings?.ads?.[position]} name={position} {...props} />;
}

interface AdHeaderCodeProps {
  code?: string;
}

// Penanda injeksi tingkat halaman (module-level agar tetap ada lintas mount).
let adHeaderInjected: string | null = null;
let adHeaderGeneration = 0;

/**
 * Script iklan tingkat halaman (Popunder, Social Bar, Smart Link).
 * Script disuntik ke <head>; elemen tampil (div, tautan) ke <body>.
 * Semua node ditandai `data-streamflix-ad-header` agar bisa dilepas saat
 * kode diubah. Menggunakan penomoran generasi agar injeksi lama yang masih
 * berjalan berhenti ketika kode berganti.
 */
export function AdHeaderCode({ code }: AdHeaderCodeProps) {
  const html = code?.trim() ?? '';

  useEffect(() => {
    if (adHeaderInjected === html) return;

    adHeaderInjected = html;
    const myGeneration = ++adHeaderGeneration;

    // Lepas injeksi lama (script maupun elemen yang ditandai).
    document
      .querySelectorAll('[data-streamflix-ad-header]')
      .forEach((el) => el.remove());

    if (!html) return;

    void (async () => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      for (const node of Array.from(temp.childNodes)) {
        // Kode sudah berganti / generasi baru — hentikan rantai lama.
        if (adHeaderGeneration !== myGeneration) return;

        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
          const old = node as HTMLScriptElement;
          const script = document.createElement('script');
          for (const attr of Array.from(old.attributes)) {
            script.setAttribute(attr.name, attr.value);
          }
          script.setAttribute('data-streamflix-ad-header', '');

          if (old.src) {
            await new Promise<void>((resolve) => {
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
              };
              const timer = setTimeout(finish, SCRIPT_LOAD_TIMEOUT_MS);
              script.onload = finish;
              script.onerror = finish;
              if (adHeaderGeneration !== myGeneration) {
                finish();
                return;
              }
              document.head.appendChild(script);
            });
          } else {
            script.textContent = old.textContent;
            document.head.appendChild(script);
          }
        } else {
          // Elemen tampil (div, tautan) harus masuk <body> agar terlihat —
          // konten <head> tidak dirender browser.
          const el = document.importNode(node, true) as Element;
          el.setAttribute('data-streamflix-ad-header', '');
          document.body.appendChild(el);
        }
      }
    })();
  }, [html]);

  return null;
}
