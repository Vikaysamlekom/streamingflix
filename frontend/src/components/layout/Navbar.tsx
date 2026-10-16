import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDebounce } from '@/hooks/use-debounce';
import { usePublicSettings } from '@/features/movies/hooks/use-catalog';

interface NavItem {
  to: string;
  label: string;
  /** Predikat apakah item dianggap aktif untuk lokasi saat ini. */
  match: (pathname: string, search: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Beranda', match: (p) => p === '/' },
  {
    to: '/movies',
    label: 'Film',
    match: (p, s) => p.startsWith('/movies') && !s.includes('sort=popular'),
  },
  { to: '/genres', label: 'Genre', match: (p) => p.startsWith('/genres') },
  {
    to: '/movies?sort=popular',
    label: 'Terbaru & Populer',
    match: (p, s) => p.startsWith('/movies') && s.includes('sort=popular'),
  },
  { to: '/my-list', label: 'Daftar Saya', match: (p) => p.startsWith('/my-list') },
];

/**
 * Navbar publik: sticky, latar gelap semi-transparan, blur saat scroll.
 * TANPA avatar, profil, notifikasi, TV Shows, atau login/daftar.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term, 500);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: settings } = usePublicSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Tutup menu mobile saat rute berubah.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Navigasi ke /search saat pencarian (debounced) berubah.
  useEffect(() => {
    const value = debounced.trim();
    if (value.length >= 2) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sinkronkan isi kolom pencarian dengan ?q= saat berada di /search
  // (mis. saat membuka tautan pencarian secara langsung).
  useEffect(() => {
    if (location.pathname !== '/search') return;
    const q = new URLSearchParams(location.search).get('q') ?? '';
    setTerm((prev) => (prev === q ? prev : q));
  }, [location.pathname, location.search]);

  const submitSearch = () => {
    const value = term.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  const focusSearch = () => {
    setSearchOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-colors duration-300',
        scrolled
          ? 'border-border bg-background/85 backdrop-blur-md'
          : 'border-transparent bg-gradient-to-b from-background/90 to-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="StreamFlix beranda">
          <img src="/icons/streamflix.svg" alt="" className="size-9" />
          <span className="text-lg font-extrabold tracking-tight text-text-primary">
            {settings?.siteName ?? 'StreamFlix'}
          </span>
        </Link>

        {/* Menu desktop */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(location.pathname, location.search);
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-text-primary after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Search desktop */}
          <div className="hidden items-center sm:flex">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border bg-surface/70 px-3 transition-all',
                searchOpen ? 'w-64 border-accent' : 'w-44 border-border',
              )}
            >
              <Search className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                placeholder="Cari film..."
                aria-label="Cari film"
                className="h-9 w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/70 focus:outline-none"
              />
              {term ? (
                <button
                  type="button"
                  onClick={() => setTerm('')}
                  aria-label="Bersihkan pencarian"
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Search mobile (ikon) */}
          <button
            type="button"
            onClick={focusSearch}
            aria-label="Cari"
            className="rounded-md p-2 text-text-primary hover:bg-surface-elevated sm:hidden"
          >
            <Search className="size-5" />
          </button>

          {/* Hamburger mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-text-primary hover:bg-surface-elevated md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Panel pencarian mobile */}
      {searchOpen ? (
        <div className="border-t border-border bg-background/95 px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2 rounded-full border border-accent bg-surface px-3">
            <Search className="size-4 text-text-muted" aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch();
              }}
              placeholder="Cari film..."
              aria-label="Cari film"
              className="h-9 w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/70 focus:outline-none"
            />
          </div>
        </div>
      ) : null}

      {/* Menu mobile */}
      {mobileOpen ? (
        <nav
          className="border-t border-border bg-background/95 px-4 py-3 md:hidden"
          aria-label="Navigasi mobile"
        >
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(location.pathname, location.search);
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'block rounded-md px-3 py-3 text-base font-medium',
                      isActive ? 'bg-accent/10 text-accent' : 'text-text-muted',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
