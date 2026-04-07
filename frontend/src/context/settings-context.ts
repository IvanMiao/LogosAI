import { createContext } from 'react';
import { type UseSettingsReturn } from '@/hooks/useSettings';

export const SettingsContext = createContext<UseSettingsReturn | null>(null);
