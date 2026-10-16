import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/admin/auth/AuthContext';
import { LoginForm } from '@/features/admin/auth/LoginForm';

export default function AdminLoginPage() {
  const { admin } = useAuth();

  useEffect(() => {
    document.title = 'Masuk Admin - StreamFlix';

    const head = document.head;
    let meta = head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      const createdMeta = document.createElement('meta');
      createdMeta.name = 'robots';
      head.appendChild(createdMeta);
      meta = createdMeta;
    }
    const element = meta;
    const previous = element.content;
    element.content = 'noindex';

    return () => {
      if (created) {
        element.remove();
      } else {
        element.content = previous;
      }
    };
  }, []);

  if (admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        <LoginForm />
      </div>
    </main>
  );
}
