import { useContext } from 'react';
import { type AnalysisHistoryContextValue } from '@/hooks/useAnalysis';
import { AnalysisHistoryContext } from '@/context/analysis-history-context';

export function useAnalysisHistoryContext(): AnalysisHistoryContextValue {
  const context = useContext(AnalysisHistoryContext);

  if (!context) {
    throw new Error('useAnalysisHistoryContext must be within an AnalysisProvider');
  }

  return context;
}
