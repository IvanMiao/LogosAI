import { createContext, useContext, type ReactNode } from 'react';
import { useAnalysis, type UseAnalysisReturn } from '@/hooks/useAnalysis';
import { useSettingsContext } from '@/context/SettingsContext';

const AnalysisContext = createContext<UseAnalysisReturn | null>(null);

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

export function useAnalysisContext(): UseAnalysisReturn {
  const context = useContext(AnalysisContext);

  if (!context) {
    throw new Error('useAnalysisContext must be within an AnalysisProvider');
  }

  return context;
}
