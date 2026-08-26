import { useState, type ReactElement } from 'react';
import { ScanText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnchorSkill, TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocument,
} from '@/features/reading';
import type { DocumentParagraph } from '@/features/reading/reading-core';
import type {
  AnchorMarkStatus,
  PendingSelection,
  SelectionToolbarPlacement,
  WorkspaceSessionArtifact,
} from '../workspace-types';
import { useWorkspaceViewState, type ExplainOrigin } from '../useWorkspaceViewState';
import { CloseReadingPane, type CloseReadingPaneMode } from './CloseReadingPane';
import { CloseReadingSplitLayout } from './CloseReadingSplitLayout';
import { CurrentExplainPanel } from './CurrentExplainPanel';
import { HistoryWorkspace } from './HistoryWorkspace';
import { ReaderToolbar } from './ReaderToolbar';
import { ReadingSurface } from './ReadingSurface';
import { ReaderWorkspaceLayout } from './ReaderWorkspaceLayout';
import type { WorkspaceAppChromeProps } from './WorkspaceHeader';
import {
  WorkspaceDeleteDialog,
  type WorkspaceDeletionTarget,
} from './WorkspaceDeleteDialog';

interface ReaderWorkspaceState {
  activeDocument: WorkspaceDocument;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
  sessionArtifacts: WorkspaceSessionArtifact[];
  artifactCountByAnchorId: Record<string, number>;
  noteDraftContent: string;
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
}

interface ReaderWorkspaceActions {
  setActiveAnchorId: (anchorId: string) => void;
  selectArtifact: (artifactId: string) => void;
  openSessionArtifact: (artifactId: string) => void;
  deleteArtifact: (artifactId: string) => void;
  deleteAnchor: (anchorId: string) => void;
  updateNoteDraft: (content: string) => void;
  runCloseReadDocument: () => Promise<void>;
  runExplainParagraph: (paragraph: DocumentParagraph) => Promise<void>;
  stopArtifact: (artifact: Artifact) => void;
  showSelectionActions: (
    selection: PendingSelection,
    placement: SelectionToolbarPlacement,
  ) => void;
  dismissSelectionToolbar: () => void;
  updateReaderPreference: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  updateAnalysisLanguage: (language: AnalysisLanguage) => void;
  clearDocument: () => void;
  renameDocument: (documentId: string, title: string) => void;
}

interface ReaderWorkspaceProps {
  appChrome: WorkspaceAppChromeProps;
  reading: ReaderWorkspaceState;
  actions: ReaderWorkspaceActions;
  isDesktopViewport: boolean;
  isSessionsNavigationPinned: boolean;
  noteEditorAnchorId: string | null;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onRunPendingSelectionSkill: (skill: AnchorSkill) => void;
  onStartPendingSelectionNote: () => void;
  onClearActiveAnchor: () => void;
  onRetryArtifact: (artifact: Artifact) => void;
  onOpenLibrary: () => void;
}

function CloseReadingEmptyState({ onStart }: { onStart: () => void }): ReactElement {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[#fbfbf8]">
      <header className="flex min-h-10 items-center border-b-2 border-border bg-card px-4 py-1 font-mono">
        <h2 className="text-xs font-black uppercase tracking-[0.1em] sm:text-sm">
          Close Reading
        </h2>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="max-w-md border-2 border-border bg-card p-6 text-center shadow-[4px_4px_0px_0px_var(--border)]">
          <ScanText className="mx-auto h-7 w-7" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black">Read the whole text closely</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Close Reading builds a structured, in-depth interpretation of the entire document.
          </p>
          <Button type="button" className="mt-5" onClick={onStart}>
            Start Close Reading
          </Button>
        </div>
      </div>
    </section>
  );
}

function getExplainArtifacts(reading: ReaderWorkspaceState): Artifact[] {
  return reading.activeArtifacts.filter((artifact) => artifact.type !== 'close_read');
}

function getActiveExplainArtifact(reading: ReaderWorkspaceState): Artifact | null {
  if (reading.activeArtifact?.type !== 'close_read') return reading.activeArtifact;
  return getExplainArtifacts(reading)[0] ?? null;
}

export function ReaderWorkspace({
  appChrome,
  reading,
  actions,
  isDesktopViewport,
  isSessionsNavigationPinned,
  noteEditorAnchorId,
  onRunSkill,
  onStartNote,
  onRunPendingSelectionSkill,
  onStartPendingSelectionNote,
  onClearActiveAnchor,
  onRetryArtifact,
  onOpenLibrary,
}: ReaderWorkspaceProps): ReactElement {
  const view = useWorkspaceViewState(isDesktopViewport ? 'split' : 'source');
  const visibleReaderLayout = !isDesktopViewport && view.readerLayout === 'split'
    ? 'source'
    : view.readerLayout;
  const [deletionTarget, setDeletionTarget] = useState<WorkspaceDeletionTarget | null>(null);
  const closeReadingEntries = reading.sessionArtifacts.filter(
    ({ artifact }) => artifact.type === 'close_read',
  );
  const defaultCloseReadingEntry = closeReadingEntries.find(
    ({ anchor }) => anchor.scope === 'document',
  ) ?? null;
  const activeCloseReadingEntry = closeReadingEntries.find(
    ({ artifact }) => artifact.id === view.selectedCloseReadingId,
  ) ?? defaultCloseReadingEntry;
  const closeReadings = closeReadingEntries.map(({ artifact }) => artifact);
  const isNoteEditorOpen = reading.activeAnchor?.id === noteEditorAnchorId
    || reading.noteDraftContent.length > 0;

  const requestDeleteAnchor = (anchor: TextAnchor) => {
    setDeletionTarget({
      kind: 'anchor',
      id: anchor.id,
      label: anchor.quote,
      scope: anchor.scope,
      outputCount: reading.artifactCountByAnchorId[anchor.id] ?? 0,
    });
  };

  const requestDeleteArtifact = (artifact: Artifact) => {
    setDeletionTarget({ kind: 'artifact', id: artifact.id, label: artifact.content || artifact.title });
  };

  const confirmDeletion = () => {
    if (deletionTarget?.kind === 'anchor') actions.deleteAnchor(deletionTarget.id);
    if (deletionTarget?.kind === 'artifact') actions.deleteArtifact(deletionTarget.id);
    view.selectCloseReading(null);
    setDeletionTarget(null);
  };

  const selectCloseReading = (artifactId?: string) => {
    const entry = artifactId
      ? closeReadingEntries.find(({ artifact }) => artifact.id === artifactId)
      : activeCloseReadingEntry;
    if (entry) {
      view.selectCloseReading(entry.artifact.id);
      actions.openSessionArtifact(entry.artifact.id);
    }
  };

  const openCloseReading = (artifactId?: string) => {
    selectCloseReading(artifactId);
    view.openReaderLayout(isDesktopViewport ? 'split' : 'analysis');
  };

  const openExplainForAnchor = (anchorId: string, origin: ExplainOrigin) => {
    actions.setActiveAnchorId(anchorId);
    view.openExplain(origin, isDesktopViewport ? 'split' : 'analysis');
  };

  const runPendingSelectionSkill = (skill: AnchorSkill, origin: ExplainOrigin) => {
    view.openExplain(origin, isDesktopViewport ? 'split' : 'analysis');
    onRunPendingSelectionSkill(skill);
  };

  const startPendingSelectionNote = (origin: ExplainOrigin) => {
    view.openExplain(origin, isDesktopViewport ? 'split' : 'analysis');
    onStartPendingSelectionNote();
  };

  const runExplainParagraph = async (
    paragraph: DocumentParagraph,
    origin: ExplainOrigin,
  ) => {
    view.openExplain(origin, isDesktopViewport ? 'split' : 'analysis');
    await actions.runExplainParagraph(paragraph);
  };

  const renderReadingSurface = (origin: ExplainOrigin): ReactElement => (
    <ReadingSurface
      activeDocument={reading.activeDocument}
      preferences={reading.readerPreferences}
      isIndependentScroll
      sourceRevealRequest={view.sourceRevealRequest}
      activeAnchor={reading.activeAnchor}
      anchors={reading.anchors}
      anchorMarkStatusById={reading.anchorMarkStatusById}
      selectionToolbarPlacement={reading.selectionToolbarPlacement}
      onShowSelectionActions={actions.showSelectionActions}
      onDismissSelectionToolbar={actions.dismissSelectionToolbar}
      onRunSkill={(skill) => runPendingSelectionSkill(skill, origin)}
      onStartNote={() => startPendingSelectionNote(origin)}
      onSelectAnchor={(anchorId) => openExplainForAnchor(anchorId, origin)}
      onExplainParagraph={(paragraph) => runExplainParagraph(paragraph, origin)}
    />
  );

  const currentExplainPanel = reading.activeAnchor ? (
    <CurrentExplainPanel
      activeAnchor={reading.activeAnchor}
      artifacts={getExplainArtifacts(reading)}
      activeArtifact={getActiveExplainArtifact(reading)}
      readingPreferences={reading.readerPreferences}
      noteDraftContent={reading.noteDraftContent}
      isNoteEditorOpen={isNoteEditorOpen}
      backLabel={view.explainOrigin === 'analysis' ? 'Back to Close Reading' : undefined}
      onBack={view.explainOrigin === 'analysis' ? view.closeExplain : undefined}
      onClose={() => {
        view.closeExplain();
        onClearActiveAnchor();
      }}
      onSelectArtifact={actions.selectArtifact}
      onRequestDeleteAnchor={requestDeleteAnchor}
      onRequestDeleteArtifact={requestDeleteArtifact}
      onNoteDraftChange={actions.updateNoteDraft}
      onOpenNoteEditor={onStartNote}
      onRunSkill={onRunSkill}
      onStopArtifact={actions.stopArtifact}
      onRetryArtifact={onRetryArtifact}
    />
  ) : null;

  const renderCloseReadingPane = (mode: CloseReadingPaneMode): ReactElement | null => {
    if (!activeCloseReadingEntry) return null;
    const { artifact, anchor } = activeCloseReadingEntry;
    return (
      <CloseReadingPane
        artifact={artifact}
        closeReadings={closeReadings}
        activeAnchor={anchor}
        readingPreferences={reading.readerPreferences}
        mode={mode}
        onShowSource={() => {
          view.openReaderLayout('source');
          view.revealSource();
        }}
        onSelectArtifact={selectCloseReading}
        onRequestDeleteArtifact={requestDeleteArtifact}
        onStopArtifact={actions.stopArtifact}
        onRetryArtifact={onRetryArtifact}
      />
    );
  };

  const startCloseReading = () => {
    void actions.runCloseReadDocument();
  };
  const closeReadingDetail = view.isExplainOpen && currentExplainPanel
    ? currentExplainPanel
    : renderCloseReadingPane(
      isDesktopViewport
        ? (visibleReaderLayout === 'analysis' ? 'focus' : 'split')
        : 'mobile',
    );
  const analysisDetail = closeReadingDetail ?? (
    <CloseReadingEmptyState onStart={startCloseReading} />
  );

  let workspaceContent: ReactElement;
  if (view.destination === 'history') {
    workspaceContent = (
      <HistoryWorkspace
        entries={reading.sessionArtifacts}
        readingPreferences={reading.readerPreferences}
        onOpenEntry={(entry) => {
          actions.openSessionArtifact(entry.artifact.id);
          if (entry.artifact.type === 'close_read') openCloseReading(entry.artifact.id);
          else view.openExplain('source', isDesktopViewport ? 'split' : 'analysis');
        }}
        onRequestDeleteArtifact={requestDeleteArtifact}
      />
    );
  } else if (isDesktopViewport && visibleReaderLayout === 'split') {
    workspaceContent = (
      <CloseReadingSplitLayout
        storageScope={reading.activeDocument.id}
        readingSurface={renderReadingSurface('analysis')}
        analysisPane={analysisDetail}
      />
    );
  } else if (visibleReaderLayout === 'analysis') {
    workspaceContent = analysisDetail;
  } else {
    workspaceContent = (
      <ReaderWorkspaceLayout
        readingSurface={renderReadingSurface('source')}
        detailPanel={null}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{reading.activeDocument.title}</h1>
      <ReaderToolbar
        appChrome={appChrome}
        activeDocument={reading.activeDocument}
        preferences={reading.readerPreferences}
        analysisLanguage={reading.analysisLanguage}
        destination={view.destination}
        readerLayout={visibleReaderLayout}
        isDesktopViewport={isDesktopViewport}
        isSessionsNavigationPinned={isSessionsNavigationPinned}
        onPreferenceChange={actions.updateReaderPreference}
        onAnalysisLanguageChange={actions.updateAnalysisLanguage}
        onReaderLayoutChange={(layout) => {
          actions.dismissSelectionToolbar();
          view.openReaderLayout(layout);
        }}
        onOpenHistory={() => {
          actions.dismissSelectionToolbar();
          view.openHistory();
        }}
        onClearDocument={actions.clearDocument}
        onOpenLibrary={onOpenLibrary}
        onRenameDocument={(title) => actions.renameDocument(reading.activeDocument.id, title)}
      />
      <div className="min-h-0 flex-1">
        {workspaceContent}
      </div>
      <WorkspaceDeleteDialog
        target={deletionTarget}
        onCancel={() => setDeletionTarget(null)}
        onConfirm={confirmDeletion}
      />
    </div>
  );
}
