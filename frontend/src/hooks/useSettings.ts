import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_API = 'logosai_api_key';
const STORAGE_KEY_MODEL = 'logosai_model';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface UseSettingsReturn {
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
  hasApiKey: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
  handleSave: () => Promise<void>;
}

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useSettings(): UseSettingsReturn {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(() => readStored(STORAGE_KEY_MODEL, DEFAULT_MODEL));
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => !!readStored(STORAGE_KEY_API, ''));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_API) {
        setHasApiKey(!!e.newValue);
      }
      if (e.key === STORAGE_KEY_MODEL) {
        setModel(e.newValue ?? DEFAULT_MODEL);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasApiKey && !apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      if (apiKey.trim()) {
        localStorage.setItem(STORAGE_KEY_API, apiKey.trim());
        setHasApiKey(true);
      }
      localStorage.setItem(STORAGE_KEY_MODEL, model);

      setSaveSuccess(true);
      setApiKey('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, model, hasApiKey]);

  return {
    apiKey, setApiKey,
    model, setModel,
    hasApiKey,
    isSaving,
    saveSuccess,
    error,
    handleSave,
  };
}
