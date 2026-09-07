import { createContext } from 'react';
import type { ReadingViewStore } from './reading-view-storage';

export const ReadingViewContext = createContext<{
  store: ReadingViewStore;
  saveFailed: boolean;
} | null>(null);
export const ReadingSessionContext = createContext('');
