import { useEffect } from 'react';
import { CategoriesManager } from '@/features/admin/categories/CategoriesManager';

export default function AdminCategoriesPage() {
  useEffect(() => {
    document.title = 'Kategori - Admin StreamFlix';
  }, []);

  return <CategoriesManager />;
}
