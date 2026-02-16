import { useState, useEffect } from 'react';

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

export function useSettings(): UseSettingsReturn {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setModel(data.model);
          setHasApiKey(data.has_api_key);
          if (data.has_api_key && data.gemini_api_key) {
            setApiKey('');
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!hasApiKey && !apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const payload: { model: string; gemini_api_key?: string } = { model };
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setHasApiKey(data.has_api_key);
        setSaveSuccess(true);
        setApiKey('');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

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
