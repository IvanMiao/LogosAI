import { useContext } from 'react';
import { type AnalysisContextValue } from '@/hooks/useAnalysis';
import { AnalysisContext } from '@/context/analysis-context';

export function useAnalysisContext(): AnalysisContextValue {
  const context = useContext(AnalysisContext);

  if (!context) {
    throw new Error('useAnalysisContext must be within an AnalysisProvider');
  }

  return context;
}
