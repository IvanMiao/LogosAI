import type { ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { SettingsContext } from '@/context/settingsContextStore';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
