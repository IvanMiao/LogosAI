import type { AnalysisModel } from '@/types';

const API_KEY_STORAGE_KEY = 'logosai_api_key';
const MODEL_STORAGE_KEY = 'logosai_model';

export const DEFAULT_MODEL: AnalysisModel = 'gemini-2.5-flash';

function readStoredValue(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function isAnalysisModel(value: string): value is AnalysisModel {
  return value === 'gemini-2.5-flash' || value === 'gemini-2.5-pro';
}

export function readStoredApiKey(): string {
  return readStoredValue(API_KEY_STORAGE_KEY, '');
}

export function readStoredModel(): AnalysisModel {
  const value = readStoredValue(MODEL_STORAGE_KEY, DEFAULT_MODEL);
  return isAnalysisModel(value) ? value : DEFAULT_MODEL;
}

export function persistSettings(apiKey: string, model: AnalysisModel): void {
  if (apiKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  }

  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function isApiKeyStorageEvent(event: StorageEvent): boolean {
  return event.key === API_KEY_STORAGE_KEY;
}

export function isModelStorageEvent(event: StorageEvent): boolean {
  return event.key === MODEL_STORAGE_KEY;
}
