import { useContext } from 'react';
import type { UseAnalysisReturn } from '@/hooks/useAnalysis';
import { AnalysisContext } from '@/context/analysisContextStore';

export function useAnalysisContext(): UseAnalysisReturn {
  const context = useContext(AnalysisContext);

  if (!context) {
    throw new Error('useAnalysisContext must be within an AnalysisProvider');
  }

  return context;
}
