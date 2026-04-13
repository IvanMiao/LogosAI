export type AnalysisModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type AnalysisStreamStage = 'detect' | 'correct' | 'interpret';

export interface HistoryItem {
  id: number;
  prompt: string;
  result: string;
  targetLanguage: string;
  timestamp?: string;
}
