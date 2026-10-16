import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

/**
 * Footer publik. Ikon sosial HANYA tampil jika URL diisi di Pengaturan.
 * Tidak ada tautan admin.
 */
export function Footer() {
  const { data: settings } = usePublicSettings();
  const social = settings?.social;

  const socials = [
    { key: 'facebook', url: social?.facebook, Icon: Facebook, label: 'Facebook' },
    { key: 'instagram', url: social?.instagram, Icon: Instagram, label: 'Instagram' },
    { key: 'twitter', url: social?.twitter, Icon: Twitter, label: 'Twitter' },
    { key: 'youtube', url: social?.youtube, Icon: Youtube, label: 'YouTube' },
  ].filter((s) => s.url && s.url.trim().length > 0);

  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <img src="/icons/streamflix.svg" alt="" className="size-8" />
              <span className="text-lg font-extrabold text-text-primary">
                {settings?.siteName ?? 'StreamFlix'}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-muted">
              {settings?.tagline ||
                'Nonton film favoritmu kapan saja, di mana saja.'}
            </p>
          </div>

          <nav aria-label="Tautan footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              <li>
                <Link to="/tentang" className="text-text-muted hover:text-text-primary">
                  Tentang
                </Link>
              </li>
              <li>
                <Link to="/bantuan" className="text-text-muted hover:text-text-primary">
                  Bantuan
                </Link>
              </li>
              <li>
                <Link to="/syarat" className="text-text-muted hover:text-text-primary">
                  Syarat
                </Link>
              </li>
              <li>
                <Link to="/privasi" className="text-text-muted hover:text-text-primary">
                  Privasi
                </Link>
              </li>
            </ul>
          </nav>

          {socials.length > 0 ? (
            <div className="flex items-center gap-3">
              {socials.map(({ key, url, Icon, label }) => (
                <a
                  key={key}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-full border border-border p-2 text-text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-text-muted">
          © {new Date().getFullYear()} {settings?.siteName ?? 'StreamFlix'}. Seluruh
          hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
