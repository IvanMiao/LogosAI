import { Outlet } from 'react-router-dom';
import { UserSettingsProvider } from '@/features/user-settings';

export function AppLayout() {
  return (
    <UserSettingsProvider>
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    </UserSettingsProvider>
  );
}
