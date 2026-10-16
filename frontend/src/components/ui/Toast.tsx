/* eslint-disable react-refresh/only-export-components -- hook & provider sengaja satu berkas */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-accent/40 bg-surface',
  error: 'border-danger/40 bg-surface',
  info: 'border-border bg-surface',
};

const iconByVariant: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-accent" aria-hidden="true" />,
  error: <AlertCircle className="size-5 text-danger" aria-hidden="true" />,
  info: <Info className="size-5 text-text-muted" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (message, variant = 'info') => push(message, variant),
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,360px)] flex-col gap-2"
        role="region"
        aria-label="Notifikasi"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border p-3.5 shadow-[var(--shadow-elevated)] animate-slide-up',
              variantStyles[t.variant],
            )}
          >
            <span className="mt-0.5 shrink-0">{iconByVariant[t.variant]}</span>
            <p className="flex-1 text-sm text-text-primary">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
              aria-label="Tutup notifikasi"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus dipakai di dalam ToastProvider');
  }
  return ctx;
}
