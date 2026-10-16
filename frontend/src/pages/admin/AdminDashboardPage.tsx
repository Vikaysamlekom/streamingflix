import { useEffect } from 'react';
import { DashboardStats } from '@/features/admin/dashboard/DashboardStats';

export default function AdminDashboardPage() {
  useEffect(() => {
    document.title = 'Dashboard - Admin StreamFlix';
  }, []);

  return <DashboardStats />;
}
