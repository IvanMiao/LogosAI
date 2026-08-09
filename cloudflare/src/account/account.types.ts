export type AnalysisModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface UserSettings {
  model: AnalysisModel;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  updatedAt: string | null;
}

export interface StoredUserSettings {
  userId: string;
  model: AnalysisModel;
  encryptedApiKey: string | null;
  apiKeyIv: string | null;
  apiKeyHint: string | null;
  updatedAt: number;
}
