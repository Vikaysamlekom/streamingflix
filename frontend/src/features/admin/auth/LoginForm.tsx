import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Input, PasswordInput } from '@/components/ui/Input';
import { ApiRequestError } from '@/services/api/client';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: string;
}

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from =
    (location.state as LocationState | null)?.from ?? '/admin/dashboard';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        setFormError('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
      } else {
        setFormError('Email atau password salah');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col items-center gap-3 text-center">
        <img
          src="/icons/streamflix.svg"
          alt="StreamFlix"
          className="h-8 w-auto"
        />
        <span className="flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Masuk Admin
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Kelola katalog film StreamFlix.
          </p>
        </div>
      </div>

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="admin@streamflix.id"
        error={errors.email?.message}
        {...register('email')}
      />

      <FieldWrapper
        label="Password"
        error={errors.password?.message}
        required
        htmlFor="login-password"
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('password')}
        />
      </FieldWrapper>

      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Masuk
      </Button>
    </form>
  );
}
