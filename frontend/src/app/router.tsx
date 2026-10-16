import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Spinner } from '@/components/ui/Spinner';
import { AuthProvider } from '@/features/admin/auth/AuthContext';
import { RequireAdmin } from '@/features/admin/auth/RequireAdmin';

// Halaman publik (dimuat langsung).
import { HomePage } from '@/pages/HomePage';
import { MoviesPage } from '@/pages/MoviesPage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { WatchPage } from '@/pages/WatchPage';
import { GenresPage } from '@/pages/GenresPage';
import { SearchPage } from '@/pages/SearchPage';
import { MyListPage } from '@/pages/MyListPage';
import {
  AboutPage,
  HelpPage,
  TermsPage,
  PrivacyPage,
  NotFoundPage,
} from '@/pages/StaticPages';

// Halaman admin (dimuat terpisah agar bundel publik tetap ringan).
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminMoviesPage = lazy(() => import('@/pages/admin/AdminMoviesPage'));
const AdminMovieFormPage = lazy(() => import('@/pages/admin/AdminMovieFormPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));

/** Fallback saat memuat potongan bundel halaman. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner label="Memuat halaman..." />
    </div>
  );
}

/** Peta rute aplikasi (publik + admin). */
export function AppRouter() {
  return (
    <Routes>
      {/* ---------------------------- Publik ---------------------------- */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="movies" element={<MoviesPage />} />
        <Route path="movies/:slug" element={<MovieDetailPage />} />
        <Route path="watch/:slug" element={<WatchPage />} />
        <Route path="genres" element={<GenresPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="my-list" element={<MyListPage />} />
        <Route path="tentang" element={<AboutPage />} />
        <Route path="bantuan" element={<HelpPage />} />
        <Route path="syarat" element={<TermsPage />} />
        <Route path="privasi" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ---------------------------- Admin ----------------------------- */}
      <Route
        path="/admin"
        element={
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </AuthProvider>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="login" element={<AdminLoginPage />} />

        {/* Area terproteksi (dibungkus RequireAdmin + AdminLayout) */}
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="movies" element={<AdminMoviesPage />} />
          <Route path="movies/new" element={<AdminMovieFormPage />} />
          <Route path="movies/:id/edit" element={<AdminMovieFormPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
