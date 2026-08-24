import { useRef, useState, type ReactElement } from 'react';
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
import { FocusedCloseReadingDialog } from './FocusedCloseReadingDialog';
import { HistoryWorkspace } from './HistoryWorkspace';
import { MobileWorkspaceDialog } from './MobileWorkspaceDialog';
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
    <section className="flex h-full min-h-0 items-center justify-center overflow-y-auto border-e-2 border-border bg-[#fbfbf8] p-6">
      <div className="max-w-md border-2 border-border bg-card p-6 text-center shadow-[6px_6px_0px_0px_var(--border)]">
        <ScanText className="mx-auto h-7 w-7" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-black">Read the whole text closely</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Close Reading builds a structured, in-depth interpretation of the entire document.
        </p>
        <Button type="button" className="mt-5" onClick={onStart}>
          Start Close Reading
        </Button>
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
  const view = useWorkspaceViewState();
  const focusButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const isCloseReadingFocused = activeCloseReadingEntry?.artifact.id
    === view.focusedCloseReadingId;
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

  const openCloseReading = (artifactId?: string) => {
    const entry = artifactId
      ? closeReadingEntries.find(({ artifact }) => artifact.id === artifactId)
      : activeCloseReadingEntry;
    if (entry) {
      view.selectCloseReading(entry.artifact.id);
      actions.openSessionArtifact(entry.artifact.id);
    }
    view.openMode('close-reading');
  };

  const openExplainForAnchor = (anchorId: string, origin: ExplainOrigin) => {
    actions.setActiveAnchorId(anchorId);
    view.openExplain(origin);
  };

  const runPendingSelectionSkill = (skill: AnchorSkill, origin: ExplainOrigin) => {
    view.openExplain(origin);
    onRunPendingSelectionSkill(skill);
  };

  const startPendingSelectionNote = (origin: ExplainOrigin) => {
    view.openExplain(origin);
    onStartPendingSelectionNote();
  };

  const runExplainParagraph = async (
    paragraph: DocumentParagraph,
    origin: ExplainOrigin,
  ) => {
    view.openExplain(origin);
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
      backLabel={view.explainOrigin === 'close-reading' ? 'Back to Close Reading' : undefined}
      onBack={view.explainOrigin === 'close-reading' ? view.closeExplain : undefined}
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
        focusButtonRef={focusButtonRef}
        onFocus={() => view.focusCloseReading(artifact.id)}
        onShowSource={() => {
          if (mode === 'focus') {
            view.exitFocus();
            view.revealSource();
            return;
          }
          view.openMode('text');
        }}
        onClose={() => view.openMode('text')}
        onSelectArtifact={openCloseReading}
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
    : renderCloseReadingPane(isDesktopViewport ? 'split' : 'mobile');

  let workspaceContent: ReactElement;
  if (view.mode === 'history') {
    workspaceContent = (
      <HistoryWorkspace
        entries={reading.sessionArtifacts}
        readingPreferences={reading.readerPreferences}
        onOpenEntry={(entry) => {
          actions.openSessionArtifact(entry.artifact.id);
          if (entry.artifact.type === 'close_read') openCloseReading(entry.artifact.id);
          else view.openExplain('text');
        }}
        onRequestDeleteArtifact={requestDeleteArtifact}
      />
    );
  } else if (view.mode === 'close-reading') {
    const detail = closeReadingDetail ?? <CloseReadingEmptyState onStart={startCloseReading} />;
    workspaceContent = isDesktopViewport ? (
      <CloseReadingSplitLayout
        readingSurface={renderReadingSurface('close-reading')}
        closeReadingPane={detail}
      />
    ) : detail;
  } else {
    workspaceContent = (
      <ReaderWorkspaceLayout
        readingSurface={renderReadingSurface('text')}
        detailPanel={isDesktopViewport && view.isExplainOpen ? currentExplainPanel : null}
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
        mode={view.mode}
        isSessionsNavigationPinned={isSessionsNavigationPinned}
        onPreferenceChange={actions.updateReaderPreference}
        onAnalysisLanguageChange={actions.updateAnalysisLanguage}
        onModeChange={(mode) => {
          actions.dismissSelectionToolbar();
          if (mode === 'close-reading') openCloseReading();
          else view.openMode(mode);
        }}
        onClearDocument={actions.clearDocument}
        onOpenLibrary={onOpenLibrary}
        onRenameDocument={(title) => actions.renameDocument(reading.activeDocument.id, title)}
      />
      <div className="min-h-0 flex-1">
        {workspaceContent}
      </div>
      {!isDesktopViewport && view.mode === 'text' && currentExplainPanel ? (
        <MobileWorkspaceDialog
          open={view.isExplainOpen}
          title="Current explanation"
          description="Saved reading help for the current source."
          content={currentExplainPanel}
          onOpenChange={(open) => {
            if (!open) view.closeExplain();
          }}
        />
      ) : null}
      {isDesktopViewport ? (
        <FocusedCloseReadingDialog
          open={isCloseReadingFocused}
          closeReadingPane={isCloseReadingFocused ? renderCloseReadingPane('focus') : null}
          onOpenChange={(open) => {
            if (!open) view.exitFocus();
          }}
          onReturnFocus={() => focusButtonRef.current?.focus()}
        />
      ) : null}
      <WorkspaceDeleteDialog
        target={deletionTarget}
        onCancel={() => setDeletionTarget(null)}
        onConfirm={confirmDeletion}
      />
    </div>
  );
}
