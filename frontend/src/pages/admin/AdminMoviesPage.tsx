import { useEffect } from 'react';
import { MoviesTable } from '@/features/admin/movies/MoviesTable';

export default function AdminMoviesPage() {
  useEffect(() => {
    document.title = 'Kelola Film - Admin StreamFlix';
  }, []);

  return <MoviesTable />;
}
