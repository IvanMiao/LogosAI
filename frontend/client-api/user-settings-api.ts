import type { AnalysisModel } from '@/types';
import { requestCloudEmpty, requestCloudJson } from './cloud-api';

export interface UserSettingsResponse {
  model: AnalysisModel;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  updatedAt: string | null;
}

interface SettingsEnvelope {
  settings: UserSettingsResponse;
}

export async function getUserSettings(): Promise<UserSettingsResponse> {
  const response = await requestCloudJson<SettingsEnvelope>('/api/account/settings');
  return response.settings;
}

export async function saveUserSettings(input: {
  model: AnalysisModel;
  apiKey?: string;
}): Promise<UserSettingsResponse> {
  const response = await requestCloudJson<SettingsEnvelope>('/api/account/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.settings;
}

export function clearUserApiKey(): Promise<void> {
  return requestCloudEmpty('/api/account/api-key', { method: 'DELETE' });
}
