import { useState } from 'react';

export type WorkspaceMode = 'text' | 'close-reading' | 'history';
export type ExplainOrigin = 'text' | 'close-reading';

interface WorkspaceViewState {
  mode: WorkspaceMode;
  explainOrigin: ExplainOrigin;
  isExplainOpen: boolean;
  focusedCloseReadingId: string | null;
  selectedCloseReadingId: string | null;
  sourceRevealRequest: number;
}

interface WorkspaceViewController extends WorkspaceViewState {
  openMode: (mode: WorkspaceMode) => void;
  openExplain: (origin: ExplainOrigin) => void;
  closeExplain: () => void;
  focusCloseReading: (artifactId: string) => void;
  exitFocus: () => void;
  selectCloseReading: (artifactId: string | null) => void;
  revealSource: () => void;
}

export function useWorkspaceViewState(): WorkspaceViewController {
  const [view, setView] = useState<WorkspaceViewState>({
    mode: 'text',
    explainOrigin: 'text',
    isExplainOpen: false,
    focusedCloseReadingId: null,
    selectedCloseReadingId: null,
    sourceRevealRequest: 0,
  });

  const openMode = (mode: WorkspaceMode) => {
    setView((current) => ({
      ...current,
      mode,
      explainOrigin: mode === 'close-reading' ? current.explainOrigin : 'text',
      isExplainOpen: false,
      focusedCloseReadingId: null,
    }));
  };

  const openExplain = (origin: ExplainOrigin) => {
    setView((current) => ({
      ...current,
      mode: origin === 'text' ? 'text' : 'close-reading',
      explainOrigin: origin,
      isExplainOpen: true,
      focusedCloseReadingId: null,
    }));
  };

  const closeExplain = () => {
    setView((current) => ({ ...current, isExplainOpen: false }));
  };

  const selectCloseReading = (artifactId: string | null) => {
    setView((current) => ({
      ...current,
      selectedCloseReadingId: artifactId,
      focusedCloseReadingId: current.focusedCloseReadingId ? artifactId : null,
    }));
  };

  return {
    ...view,
    openMode,
    openExplain,
    closeExplain,
    focusCloseReading: (artifactId) => {
      setView((current) => ({ ...current, focusedCloseReadingId: artifactId }));
    },
    exitFocus: () => {
      setView((current) => ({ ...current, focusedCloseReadingId: null }));
    },
    selectCloseReading,
    revealSource: () => {
      setView((current) => ({
        ...current,
        sourceRevealRequest: current.sourceRevealRequest + 1,
      }));
    },
  };
}
