import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FieldWrapper, Input, PasswordInput, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ErrorState } from '@/components/feedback/States';
import { adminSettingsApi } from '@/services/api/settings.api';
import { ApiRequestError } from '@/services/api/client';
import { useAuth } from '@/features/admin/auth/AuthContext';
import type { SiteSettings } from '@/types';
import { cn } from '@/utils/cn';

type TabKey = 'site' | 'security' | 'system';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'site', label: 'Situs' },
  { key: 'security', label: 'Keamanan Akun' },
  { key: 'system', label: 'Info Sistem' },
];

const siteSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, 'Nama situs wajib diisi')
    .max(100, 'Nama situs maksimal 100 karakter'),
  tagline: z.string().max(200, 'Tagline maksimal 200 karakter'),
  seoDescription: z.string().max(300, 'Deskripsi SEO maksimal 300 karakter'),
  heroSlideLimit: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 8, {
      message: 'Harus berupa angka antara 1 dan 8',
    }),
  socialFacebook: z.string().trim(),
  socialInstagram: z.string().trim(),
  socialTwitter: z.string().trim(),
  socialYoutube: z.string().trim(),
});

type SiteFormValues = z.infer<typeof siteSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(12, 'Password baru minimal 12 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function SettingsManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('site');

  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingsApi.get(),
  });

  const settings = settingsQuery.data?.data.settings;
  const system = settingsQuery.data?.data.system;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text-primary">Pengaturan</h1>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              activeTab === tab.key
                ? 'border-accent font-semibold text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settingsQuery.isError ? (
        <ErrorState
          title="Gagal memuat pengaturan"
          description="Pengaturan tidak dapat dimuat saat ini."
          onRetry={() => {
            void settingsQuery.refetch();
          }}
        />
      ) : activeTab === 'system' ? (
        <SystemInfoPanel
          loading={settingsQuery.isLoading}
          appVersion={system?.appVersion}
          databaseConnected={system?.databaseConnected}
          allowedVideoHosts={system?.allowedVideoHosts}
        />
      ) : activeTab === 'security' ? (
        <SecurityPanel />
      ) : (
        <SitePanel loading={settingsQuery.isLoading} settings={settings} />
      )}
    </div>
  );
}

interface SitePanelProps {
  loading: boolean;
  settings: SiteSettings | undefined;
}

function SitePanel({ loading, settings }: SitePanelProps) {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      siteName: '',
      tagline: '',
      seoDescription: '',
      heroSlideLimit: '5',
      socialFacebook: '',
      socialInstagram: '',
      socialTwitter: '',
      socialYoutube: '',
    },
  });

  useEffect(() => {
    if (!settings) return;
    reset({
      siteName: settings.siteName,
      tagline: settings.tagline,
      seoDescription: settings.seoDescription,
      heroSlideLimit: String(settings.heroSlideLimit),
      socialFacebook: settings.socialFacebook,
      socialInstagram: settings.socialInstagram,
      socialTwitter: settings.socialTwitter,
      socialYoutube: settings.socialYoutube,
    });
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: SiteFormValues) =>
      adminSettingsApi.update({
        siteName: values.siteName.trim(),
        tagline: values.tagline.trim(),
        seoDescription: values.seoDescription.trim(),
        heroSlideLimit: Number(values.heroSlideLimit),
        socialFacebook: values.socialFacebook.trim(),
        socialInstagram: values.socialInstagram.trim(),
        socialTwitter: values.socialTwitter.trim(),
        socialYoutube: values.socialYoutube.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      success('Pengaturan situs berhasil disimpan.');
    },
    onError: (err) => {
      showError(
        err instanceof ApiRequestError
          ? err.message
          : 'Gagal menyimpan pengaturan.',
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-3xl flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-5"
      noValidate
    >
      <Input
        label="Nama Situs"
        required
        error={errors.siteName?.message}
        {...register('siteName')}
      />
      <Input
        label="Tagline"
        error={errors.tagline?.message}
        {...register('tagline')}
      />
      <Textarea
        label="Deskripsi SEO"
        rows={3}
        error={errors.seoDescription?.message}
        {...register('seoDescription')}
      />
      <Input
        label="Jumlah Slide Hero"
        type="number"
        min={1}
        max={8}
        hint="Antara 1 sampai 8 film unggulan di beranda."
        error={errors.heroSlideLimit?.message}
        {...register('heroSlideLimit')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Facebook"
          placeholder="https://facebook.com/..."
          error={errors.socialFacebook?.message}
          {...register('socialFacebook')}
        />
        <Input
          label="Instagram"
          placeholder="https://instagram.com/..."
          error={errors.socialInstagram?.message}
          {...register('socialInstagram')}
        />
        <Input
          label="Twitter / X"
          placeholder="https://x.com/..."
          error={errors.socialTwitter?.message}
          {...register('socialTwitter')}
        />
        <Input
          label="YouTube"
          placeholder="https://youtube.com/..."
          error={errors.socialYoutube?.message}
          {...register('socialYoutube')}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={isSubmitting || updateMutation.isPending}
        >
          Simpan
        </Button>
      </div>
    </form>
  );
}

function SecurityPanel() {
  const { admin } = useAuth();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changeMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      adminSettingsApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      success('Password berhasil diubah.');
      reset();
    },
    onError: (err) => {
      showError(
        err instanceof ApiRequestError
          ? err.message
          : 'Gagal mengubah password.',
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    changeMutation.mutate(values);
  });

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <p className="text-sm text-text-muted">
          Anda masuk sebagai{' '}
          <span className="font-medium text-text-primary">
            {admin?.email ?? '-'}
          </span>
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-5"
        noValidate
      >
        <h2 className="text-base font-semibold text-text-primary">
          Ubah Password
        </h2>
        <FieldWrapper
          label="Password Saat Ini"
          required
          error={errors.currentPassword?.message}
          htmlFor="currentPassword"
        >
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            {...register('currentPassword')}
          />
        </FieldWrapper>
        <FieldWrapper
          label="Password Baru"
          required
          hint="Minimal 12 karakter."
          error={errors.newPassword?.message}
          htmlFor="newPassword"
        >
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            {...register('newPassword')}
          />
        </FieldWrapper>
        <FieldWrapper
          label="Konfirmasi Password Baru"
          required
          error={errors.confirmPassword?.message}
          htmlFor="confirmPassword"
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        </FieldWrapper>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSubmitting || changeMutation.isPending}
          >
            Ubah Password
          </Button>
        </div>
      </form>
    </div>
  );
}

interface SystemInfoPanelProps {
  loading: boolean;
  appVersion?: string;
  databaseConnected?: boolean;
  allowedVideoHosts?: string[];
}

function SystemInfoPanel({
  loading,
  appVersion,
  databaseConnected,
  allowedVideoHosts,
}: SystemInfoPanelProps) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-text-primary">
        Informasi Sistem
      </h2>

      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <span className="text-sm text-text-muted">Versi Aplikasi</span>
        <span className="text-sm font-medium text-text-primary">
          {appVersion ?? '-'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <span className="text-sm text-text-muted">Status Database</span>
        <Badge variant={databaseConnected ? 'published' : 'danger'}>
          {databaseConnected ? 'Terhubung' : 'Terputus'}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Host Video yang Diizinkan</span>
        {allowedVideoHosts && allowedVideoHosts.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {allowedVideoHosts.map((host) => (
              <li
                key={host}
                className="rounded-[var(--radius-button)] border border-border bg-background px-3 py-1.5 font-mono text-xs text-text-primary"
              >
                {host}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-text-muted">-</span>
        )}
      </div>
    </div>
  );
}
