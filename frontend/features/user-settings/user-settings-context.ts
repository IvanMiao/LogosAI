import { createContext } from 'react';
import type { UserSettingsContextValue } from './user-settings-types';

export const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);
