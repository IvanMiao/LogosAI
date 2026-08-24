import { useContext } from 'react';
import { UserSettingsContext } from './user-settings-context';
import type { UserSettingsContextValue } from './user-settings-types';

export function useUserSettings(): UserSettingsContextValue {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used inside UserSettingsProvider.');
  }
  return context;
}
