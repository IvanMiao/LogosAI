import { useEffect, useState } from 'react';
import { useUserSettings } from '@/features/user-settings';
import type { AnalysisModel } from '@/types';

export const MISSING_API_KEY_ERROR = 'Enter your Gemini API key to continue.';

export interface UseSettingsPageReturn {
  apiKey: string;
  setApiKey: (key: string) => void;
  apiKeyHint: string | null;
  model: AnalysisModel;
  setModel: (model: AnalysisModel) => void;
  hasApiKey: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isClearing: boolean;
  saveSuccess: boolean;
  error: string;
  saveSettings: () => Promise<void>;
  clearApiKey: () => Promise<void>;
}

export function useSettingsPage(): UseSettingsPageReturn {
  const userSettings = useUserSettings();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<AnalysisModel>(userSettings.model);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setModel(userSettings.model);
  }, [userSettings.model]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timeoutId = window.setTimeout(() => setSaveSuccess(false), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [saveSuccess]);

  const saveSettings = async () => {
    if (!userSettings.hasApiKey && !apiKey.trim()) {
      setError(MISSING_API_KEY_ERROR);
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      await userSettings.save({
        model,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setApiKey('');
      setSaveSuccess(true);
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'Unable to save settings. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearApiKey = async () => {
    setIsClearing(true);
    setError('');
    try {
      await userSettings.clearApiKey();
      setApiKey('');
    } catch (clearError) {
      setError(clearError instanceof Error
        ? clearError.message
        : 'Unable to remove the API key. Try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return {
    apiKey,
    setApiKey,
    apiKeyHint: userSettings.apiKeyHint,
    model,
    setModel,
    hasApiKey: userSettings.hasApiKey,
    isLoading: userSettings.status === 'loading',
    isSaving,
    isClearing,
    saveSuccess,
    error: error || userSettings.error,
    saveSettings,
    clearApiKey,
  };
}
