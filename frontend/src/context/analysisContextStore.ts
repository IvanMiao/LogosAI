import { createContext } from 'react';
import type { UseAnalysisReturn } from '@/hooks/useAnalysis';

export const AnalysisContext = createContext<UseAnalysisReturn | null>(null);
