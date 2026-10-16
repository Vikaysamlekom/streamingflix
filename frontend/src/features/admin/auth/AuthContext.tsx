/* eslint-disable react-refresh/only-export-components -- hook & provider sengaja satu berkas */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/services/api/auth.api';
import { setCsrfToken } from '@/services/api/client';
import type { AdminUser } from '@/types';

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Menyediakan status sesi admin ke seluruh area admin.
 * Sesi diverifikasi sekali saat mount melalui GET /auth/me.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setAdmin(data.admin);
    } catch {
      // Belum ada sesi / sesi kedaluwarsa / gagal terhubung.
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setCsrfToken(data.csrfToken);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setCsrfToken(null);
      setAdmin(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({ admin, isLoading, login, logout, refetch }),
    [admin, isLoading, login, logout, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return ctx;
}
