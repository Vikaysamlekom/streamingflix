import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from './AuthContext';

/**
 * Penjaga rute admin: tampilkan spinner saat sesi diperiksa, alihkan ke
 * halaman masuk bila belum terautentikasi, atau render anak bila sudah masuk.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Memeriksa sesi..." />
      </div>
    );
  }

  if (!admin) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
