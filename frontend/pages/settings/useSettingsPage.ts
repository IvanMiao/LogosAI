import { useCallback, useEffect, useState } from 'react';
import type { AnalysisModel } from '@/types';
import {
  clearStoredApiKey,
  DEFAULT_MODEL,
  isApiKeyStorageEvent,
  isModelStorageEvent,
  persistSettings,
  readStoredApiKey,
  readStoredModel,
} from '@/utils/settingsStorage';

export interface UseSettingsPageReturn {
  apiKey: string;
  setApiKey: (key: string) => void;
  savedApiKey: string;
  model: AnalysisModel;
  setModel: (model: AnalysisModel) => void;
  hasApiKey: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
  saveSettings: () => void;
  clearApiKey: () => void;
}

export function useSettingsPage(): UseSettingsPageReturn {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState(() => readStoredApiKey());
  const [model, setModel] = useState<AnalysisModel>(() => readStoredModel());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const hasApiKey = savedApiKey.trim().length > 0;

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (isApiKeyStorageEvent(event)) {
        setSavedApiKey(event.newValue ?? '');
      }

      if (isModelStorageEvent(event)) {
        setModel(event.newValue === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : DEFAULT_MODEL);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveSuccess(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [saveSuccess]);

  const saveSettings = useCallback(() => {
    if (!hasApiKey && !apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const nextApiKey = apiKey.trim();

      persistSettings(nextApiKey || savedApiKey, model);

      if (nextApiKey) {
        setSavedApiKey(nextApiKey);
      }

      setApiKey('');
      setSaveSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, hasApiKey, model, savedApiKey]);

  const clearApiKey = useCallback(() => {
    try {
      clearStoredApiKey();
    } catch {
      // Ignore storage clearing failures.
    }

    setSavedApiKey('');
    setApiKey('');
  }, []);

  return {
    apiKey,
    setApiKey,
    savedApiKey,
    model,
    setModel,
    hasApiKey,
    isSaving,
    saveSuccess,
    error,
    saveSettings,
    clearApiKey,
  };
}
