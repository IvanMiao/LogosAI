import { createContext } from 'react';
import { type AnalysisHistoryContextValue } from '@/hooks/useAnalysis';

export const AnalysisHistoryContext = createContext<AnalysisHistoryContextValue | null>(null);
