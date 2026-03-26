import { createContext, useContext, type ReactNode } from 'react';
import { useSettings, type UseSettingsReturn } from '@/hooks/useSettings';

const SettingsContext = createContext<UseSettingsReturn | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): UseSettingsReturn {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettingsContext must be within a SettingsProvider');
  }

  return context;
}
