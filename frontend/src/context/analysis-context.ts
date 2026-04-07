import { createContext } from 'react';
import { type AnalysisContextValue } from '@/hooks/useAnalysis';

export const AnalysisContext = createContext<AnalysisContextValue | null>(null);
