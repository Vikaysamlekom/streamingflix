import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  PlusCircle,
  Tags,
  Settings,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/features/admin/auth/AuthContext';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/movies', label: 'Film', Icon: Film, end: true },
  { to: '/admin/movies/new', label: 'Tambah Film', Icon: PlusCircle },
  { to: '/admin/categories', label: 'Kategori', Icon: Tags },
  { to: '/admin/settings', label: 'Pengaturan', Icon: Settings },
];

/** Judul topbar berdasarkan path saat ini. */
function resolveTitle(pathname: string): string {
  if (pathname.startsWith('/admin/dashboard')) return 'Dashboard';
  if (pathname === '/admin/movies/new') return 'Tambah Film';
  if (/^\/admin\/movies\/\d+\/edit/.test(pathname)) return 'Edit Film';
  if (pathname.startsWith('/admin/movies')) return 'Kelola Film';
  if (pathname.startsWith('/admin/categories')) return 'Kategori';
  if (pathname.startsWith('/admin/settings')) return 'Pengaturan';
  return 'Admin';
}

/**
 * Layout dashboard admin: Sidebar + Topbar, terpisah dari layout publik.
 * Dipakai sebagai layout route melalui <Outlet />.
 */
export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { pathname } = useLocation();
  const title = resolveTitle(pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay mobile */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navigasi admin"
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <img src="/icons/streamflix.svg" alt="" className="size-8" />
          <span className="text-base font-extrabold text-text-primary">
            StreamFlix
          </span>
          <span className="ml-auto rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
            Admin
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 rounded p-1 text-text-muted lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/12 text-accent before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
                    : 'text-text-muted hover:bg-surface-elevated hover:text-text-primary',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
            Lihat Situs
          </Link>
        </div>
      </aside>

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-text-primary hover:bg-surface-elevated lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">{title}</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-text-primary">
                {admin?.displayName || admin?.email || 'Admin'}
              </p>
              <p className="text-xs text-text-muted">{admin?.email}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
              {(admin?.displayName || admin?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
