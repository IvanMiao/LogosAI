import { useState } from 'react';

export type WorkspaceDestination = 'reader' | 'history';
export type ReaderLayout = 'source' | 'split' | 'analysis';
export type ExplainOrigin = 'source' | 'analysis';

interface WorkspaceViewState {
  destination: WorkspaceDestination;
  readerLayout: ReaderLayout;
  explainOrigin: ExplainOrigin;
  isExplainOpen: boolean;
  selectedCloseReadingId: string | null;
  sourceRevealRequest: number;
}

interface WorkspaceViewController extends WorkspaceViewState {
  openReaderLayout: (layout: ReaderLayout) => void;
  openHistory: () => void;
  openExplain: (origin: ExplainOrigin, layout: ReaderLayout) => void;
  closeExplain: () => void;
  selectCloseReading: (artifactId: string | null) => void;
  revealSource: () => void;
}

export function useWorkspaceViewState(
  initialReaderLayout: ReaderLayout,
): WorkspaceViewController {
  const [view, setView] = useState<WorkspaceViewState>(() => ({
    destination: 'reader',
    readerLayout: initialReaderLayout,
    explainOrigin: 'source',
    isExplainOpen: false,
    selectedCloseReadingId: null,
    sourceRevealRequest: 0,
  }));

  const openReaderLayout = (readerLayout: ReaderLayout) => {
    setView((current) => ({ ...current, destination: 'reader', readerLayout }));
  };

  const openExplain = (origin: ExplainOrigin, readerLayout: ReaderLayout) => {
    setView((current) => ({
      ...current,
      destination: 'reader',
      readerLayout,
      explainOrigin: origin,
      isExplainOpen: true,
    }));
  };

  return {
    ...view,
    openReaderLayout,
    openHistory: () => {
      setView((current) => ({ ...current, destination: 'history' }));
    },
    openExplain,
    closeExplain: () => {
      setView((current) => ({ ...current, isExplainOpen: false }));
    },
    selectCloseReading: (artifactId) => {
      setView((current) => ({ ...current, selectedCloseReadingId: artifactId }));
    },
    revealSource: () => {
      setView((current) => ({
        ...current,
        sourceRevealRequest: current.sourceRevealRequest + 1,
      }));
    },
  };
}
