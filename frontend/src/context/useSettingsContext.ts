import { useContext } from 'react';
import type { UseSettingsReturn } from '@/hooks/useSettings';
import { SettingsContext } from '@/context/settingsContextStore';

export function useSettingsContext(): UseSettingsReturn {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettingsContext must be within a SettingsProvider');
  }

  return context;
}
