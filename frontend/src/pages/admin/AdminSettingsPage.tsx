import { useEffect } from 'react';
import { SettingsManager } from '@/features/admin/settings/SettingsManager';

export default function AdminSettingsPage() {
  useEffect(() => {
    document.title = 'Pengaturan - Admin StreamFlix';
  }, []);

  return <SettingsManager />;
}
