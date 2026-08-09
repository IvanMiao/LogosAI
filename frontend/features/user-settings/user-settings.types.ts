import type { AnalysisModel } from '@/types';

export type UserSettingsStatus = 'loading' | 'ready' | 'error';

export interface UserSettingsState {
  model: AnalysisModel;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  updatedAt: string | null;
}

export interface UserSettingsContextValue extends UserSettingsState {
  status: UserSettingsStatus;
  error: string;
  save: (input: { model: AnalysisModel; apiKey?: string }) => Promise<void>;
  clearApiKey: () => Promise<void>;
  reload: () => Promise<void>;
}
