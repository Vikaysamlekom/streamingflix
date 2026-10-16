import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  FileEdit,
  Film,
  Plus,
  Star,
  Tags,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/States';
import { Poster } from '@/components/movies/Poster';
import { dashboardApi } from '@/services/api/dashboard.api';
import type { DashboardStats as DashboardStatsData } from '@/types';
import { formatDateTime, formatNumber, formatViews } from '@/utils/format';

interface StatCardDef {
  key: keyof Pick<
    DashboardStatsData,
    | 'totalMovies'
    | 'publishedMovies'
    | 'draftMovies'
    | 'totalCategories'
    | 'featuredMovies'
    | 'totalViews'
  >;
  label: string;
  icon: ReactNode;
}

const STAT_CARDS: StatCardDef[] = [
  { key: 'totalMovies', label: 'Total Film', icon: <Film className="size-5" /> },
  {
    key: 'publishedMovies',
    label: 'Published',
    icon: <CheckCircle2 className="size-5" />,
  },
  { key: 'draftMovies', label: 'Draft', icon: <FileEdit className="size-5" /> },
  {
    key: 'totalCategories',
    label: 'Total Kategori',
    icon: <Tags className="size-5" />,
  },
  {
    key: 'featuredMovies',
    label: 'Film Unggulan',
    icon: <Star className="size-5" />,
  },
  { key: 'totalViews', label: 'Total Penayangan', icon: <Eye className="size-5" /> },
];

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function DashboardStats() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => dashboardApi.stats(),
  });

  const stats = data?.data;

  if (isError) {
    return (
      <ErrorState
        title="Gagal memuat statistik"
        description="Data dashboard tidak dapat dimuat saat ini."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <Button
          variant="primary"
          leftIcon={<Plus className="size-4" />}
          onClick={() => navigate('/admin/movies/new')}
        >
          Tambah Film
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              {card.icon}
            </span>
            {isLoading || !stats ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold text-text-primary">
                {formatNumber(stats[card.key])}
              </span>
            )}
            <span className="text-xs text-text-muted">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Film Terakhir Diubah">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats && stats.recentlyUpdated.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {stats.recentlyUpdated.map((movie) => (
                <li key={movie.id} className="flex items-center gap-3">
                  <Poster
                    src={movie.posterUrl}
                    alt={movie.title}
                    title={movie.title}
                    className="w-10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {movie.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(movie.publishedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={movie.publishedAt ? 'published' : 'draft'}
                  >
                    {movie.publishedAt ? 'Published' : 'Draft'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">
              Belum ada film yang diperbarui.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Top 5 Film Terpopuler">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats && stats.topViewed.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {stats.topViewed.slice(0, 5).map((movie, index) => (
                <li key={movie.id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-lg font-bold text-text-muted">
                    {index + 1}
                  </span>
                  <Poster
                    src={movie.posterUrl}
                    alt={movie.title}
                    title={movie.title}
                    className="w-10 shrink-0"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {movie.title}
                  </p>
                  <span className="shrink-0 text-xs text-text-muted">
                    {formatViews(movie.viewCount)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">Belum ada data penayangan.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
