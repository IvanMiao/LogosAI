import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  clearUserApiKey,
  getUserSettings,
  saveUserSettings,
} from '@/client-api/user-settings-api';
import type { AnalysisModel } from '@/types';
import type {
  UserSettingsContextValue,
  UserSettingsState,
  UserSettingsStatus,
} from './user-settings-types';
import { UserSettingsContext } from './user-settings-context';

const DEFAULT_SETTINGS: UserSettingsState = {
  model: 'gemini-2.5-flash',
  hasApiKey: false,
  apiKeyHint: null,
  updatedAt: null,
};

interface UserSettingsProviderProps {
  children: ReactNode;
}

export function UserSettingsProvider({
  children,
}: UserSettingsProviderProps): ReactElement {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<UserSettingsStatus>('loading');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      setSettings(await getUserSettings());
      setStatus('ready');
    } catch (loadError) {
      setStatus('error');
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (input: {
    model: AnalysisModel;
    apiKey?: string;
  }) => {
    const saved = await saveUserSettings(input);
    setSettings(saved);
    setStatus('ready');
    setError('');
  }, []);

  const clearApiKey = useCallback(async () => {
    await clearUserApiKey();
    setSettings((current) => ({
      ...current,
      hasApiKey: false,
      apiKeyHint: null,
      updatedAt: new Date().toISOString(),
    }));
    setStatus('ready');
    setError('');
  }, []);

  const value = useMemo<UserSettingsContextValue>(() => ({
    ...settings,
    status,
    error,
    save,
    clearApiKey,
    reload,
  }), [clearApiKey, error, reload, save, settings, status]);

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}
