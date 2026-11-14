import { useCallback, useState } from 'react';
import { useReadingViewState } from './useReadingViewState';
import { isRecord } from './reading-view-storage';

export type WorkspaceDestination = 'reader' | 'history';
export type ReaderLayout = 'source' | 'split' | 'analysis';
export type ExplainOrigin = 'source' | 'analysis';

interface WorkspaceViewState {
  destination: WorkspaceDestination;
  readerLayout: ReaderLayout;
  explainOrigin: ExplainOrigin;
  isExplainOpen: boolean;
  selectedCloseReadingId: string | null;
}

export interface ParagraphReveal {
  /** 1-based position of the source paragraph. */
  paragraphNumber: number;
}

interface WorkspaceViewController extends WorkspaceViewState {
  sourceRevealRequest: number;
  paragraphReveal: ParagraphReveal | null;
  /** A pending jump from a source paragraph to its Close Reading block. */
  readingBlockReveal: ParagraphReveal | null;
  openReaderLayout: (layout: ReaderLayout) => void;
  openHistory: () => void;
  openExplain: (origin: ExplainOrigin, layout: ReaderLayout) => void;
  closeExplain: () => void;
  selectCloseReading: (artifactId: string | null) => void;
  revealSource: () => void;
  revealParagraph: (paragraphNumber: number) => void;
  clearParagraphReveal: () => void;
  revealReadingBlock: (paragraphNumber: number) => void;
  clearReadingBlockReveal: () => void;
}

export function useWorkspaceViewState(
  initialReaderLayout: ReaderLayout,
): WorkspaceViewController {
  const [sourceRevealRequest, setSourceRevealRequest] = useState(0);
  const [paragraphReveal, setParagraphReveal] = useState<ParagraphReveal | null>(null);
  const initialView: WorkspaceViewState = {
    destination: 'reader',
    readerLayout: initialReaderLayout,
    explainOrigin: 'source',
    isExplainOpen: false,
    selectedCloseReadingId: null,
  };
  const [view, setView] = useReadingViewState<WorkspaceViewState>('view', initialView, (value) => {
    if (!isRecord(value)) return initialView;
    return {
      ...initialView,
      destination: value.destination === 'history' ? 'history' : 'reader',
      readerLayout: parseLayout(value.readerLayout, initialReaderLayout),
      explainOrigin: value.explainOrigin === 'analysis' ? 'analysis' : 'source',
      isExplainOpen: value.isExplainOpen === true,
      selectedCloseReadingId: typeof value.selectedCloseReadingId === 'string' ? value.selectedCloseReadingId : null,
    };
  });

  const clearParagraphReveal = useCallback(() => setParagraphReveal(null), []);
  const [readingBlockReveal, setReadingBlockReveal] = useState<ParagraphReveal | null>(null);
  const clearReadingBlockReveal = useCallback(() => setReadingBlockReveal(null), []);

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
    sourceRevealRequest,
    paragraphReveal,
    readingBlockReveal,
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
    revealSource: () => setSourceRevealRequest((request) => request + 1),
    revealParagraph: (paragraphNumber) => setParagraphReveal({ paragraphNumber }),
    clearParagraphReveal,
    revealReadingBlock: (paragraphNumber) => setReadingBlockReveal({ paragraphNumber }),
    clearReadingBlockReveal,
  };
}

function parseLayout(value: unknown, fallback: ReaderLayout): ReaderLayout {
  return value === 'source' || value === 'split' || value === 'analysis' ? value : fallback;
}
