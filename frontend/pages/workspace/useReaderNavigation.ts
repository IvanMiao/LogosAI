import { useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReaderWorkspaceActions, ReaderWorkspaceState } from './components/reader-workspace-types';
import type { ExplainOrigin, ReaderLayout, useWorkspaceViewState } from './useWorkspaceViewState';
import { ReadingViewContext } from './reading-view-context';

interface ReaderNavigationInput {
  reading: ReaderWorkspaceState;
  actions: ReaderWorkspaceActions;
  view: ReturnType<typeof useWorkspaceViewState>;
  isDesktop: boolean;
}

export function useReaderNavigation({ reading, actions, view, isDesktop }: ReaderNavigationInput) {
  const location = useLocation();
  const navigate = useNavigate();
  const appliedLocation = useRef<string | null>(null);
  const store = useContext(ReadingViewContext)?.store;
  const params = new URLSearchParams(location.search);
  const artifactId = params.get('artifact');
  const entry = reading.sessionArtifacts.find(({ artifact }) => artifact.id === artifactId);
  const missingArtifact = Boolean(artifactId && !entry);

  useEffect(() => {
    if (appliedLocation.current === location.key) return;
    const initial = appliedLocation.current === null;
    appliedLocation.current = location.key;
    if (artifactId && entry) {
      const hasPosition = Boolean(store?.read(reading.activeDocument.id)['scroll:source']);
      applyArtifact({ reading, actions, view, isDesktop }, artifactId, initial && hasPosition, location.state);
    } else if (new URLSearchParams(location.search).get('view') === 'history') {
      view.openHistory();
    } else if (!initial) {
      view.openReaderLayout(view.readerLayout);
    }
  }, [actions, artifactId, entry, isDesktop, location.key, location.search, location.state, reading, store, view]);

  const openArtifact = (id: string, origin: ExplainOrigin = 'source', revealSource = true) => {
    view.setReturnToHistory(view.destination === 'history');
    navigate({ search: `?artifact=${encodeURIComponent(id)}` }, { state: { origin, revealSource } });
  };
  const openHistory = () => {
    view.openHistory();
    navigate({ search: '?view=history' });
  };
  const openLayout = (layout: ReaderLayout) => {
    view.openReaderLayout(layout);
    if (params.has('view')) navigate({ search: '' }, { replace: true });
  };
  const closeExplain = () => {
    view.closeExplain();
    if (artifactId) navigate({ search: '' }, { replace: true });
  };
  return { openArtifact, openHistory, openLayout, closeExplain, missingArtifact };
}

function applyArtifact(
  input: ReaderNavigationInput, artifactId: string, hasPosition: boolean,
  state: { origin?: ExplainOrigin; revealSource?: boolean } | null,
): void {
  const { reading, actions, view, isDesktop } = input;
  const artifact = reading.sessionArtifacts.find((entry) => entry.artifact.id === artifactId)?.artifact;
  if (!artifact) return;
  const resume = hasPosition && isSelectedArtifact(input, artifactId, artifact.type);
  const layout = resume ? view.readerLayout : isDesktop ? 'split' : 'analysis';
  actions.openSessionArtifact(artifactId);
  if (artifact.type === 'close_read') {
    view.closeExplain();
    view.selectCloseReading(artifactId);
    view.openReaderLayout(layout);
  } else {
    openArtifactExplanation(view, layout, resume, state);
  }
}

function isSelectedArtifact(input: ReaderNavigationInput, id: string, type: string): boolean {
  const selectedId = type === 'close_read'
    ? input.view.selectedCloseReadingId
    : input.reading.activeArtifact?.id;
  return selectedId === id;
}

function openArtifactExplanation(
  view: ReaderNavigationInput['view'], layout: ReaderLayout, resume: boolean,
  state: { origin?: ExplainOrigin; revealSource?: boolean } | null,
): void {
  view.openExplain(state?.origin === 'analysis' ? 'analysis' : 'source', layout);
  if (!resume && state?.revealSource !== false) view.revealSource();
}
