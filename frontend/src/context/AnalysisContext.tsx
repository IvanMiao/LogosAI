import type { ReactNode } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { AnalysisContext } from '@/context/analysisContextStore';
import { useSettingsContext } from '@/context/useSettingsContext';

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { savedApiKey, hasApiKey, model } = useSettingsContext();
  const analysisData = useAnalysis({
    apiKey: savedApiKey,
    hasApiKey,
    model,
  });

  return (
    <AnalysisContext.Provider value={analysisData}>
      {children}
    </AnalysisContext.Provider>
  );
}
