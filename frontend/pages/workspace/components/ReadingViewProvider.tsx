import { useState, type ReactNode } from 'react';
import { ReadingViewContext } from '../reading-view-context';
import { createReadingViewStore } from '../reading-view-storage';

export function ReadingViewProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [saveFailed, setSaveFailed] = useState(false);
  const [store] = useState(() => createReadingViewStore(userId, setSaveFailed));
  return <ReadingViewContext.Provider value={{ store, saveFailed }}>{children}</ReadingViewContext.Provider>;
}
