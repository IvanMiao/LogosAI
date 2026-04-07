import { type ReactNode, useMemo } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { AnalysisContext } from '@/context/analysis-context';
import { AnalysisHistoryContext } from '@/context/analysis-history-context';
import { useSettingsContext } from '@/context/SettingsContext';

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { savedApiKey, hasApiKey, model } = useSettingsContext();
  const analysisData = useAnalysis({
    apiKey: savedApiKey,
    hasApiKey,
    model,
  });

  const analysisValue = useMemo(
    () => ({
      text: analysisData.text,
      setText: analysisData.setText,
      language: analysisData.language,
      setLanguage: analysisData.setLanguage,
      result: analysisData.result,
      isLoading: analysisData.isLoading,
      streamStage: analysisData.streamStage,
      error: analysisData.error,
      hasApiKey: analysisData.hasApiKey,
      onAnalyze: analysisData.onAnalyze,
    }),
    [
      analysisData.text,
      analysisData.setText,
      analysisData.language,
      analysisData.setLanguage,
      analysisData.result,
      analysisData.isLoading,
      analysisData.streamStage,
      analysisData.error,
      analysisData.hasApiKey,
      analysisData.onAnalyze,
    ],
  );

  const historyValue = useMemo(
    () => ({
      history: analysisData.history,
      onDeleteHistory: analysisData.onDeleteHistory,
      onLoadHistory: analysisData.onLoadHistory,
    }),
    [
      analysisData.history,
      analysisData.onDeleteHistory,
      analysisData.onLoadHistory,
    ],
  );

  return (
    <AnalysisContext.Provider value={analysisValue}>
      <AnalysisHistoryContext.Provider value={historyValue}>
        {children}
      </AnalysisHistoryContext.Provider>
    </AnalysisContext.Provider>
  );
}
