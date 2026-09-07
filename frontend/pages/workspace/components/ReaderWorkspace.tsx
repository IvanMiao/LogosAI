import { useState, type ReactElement } from 'react';
import type { AnchorSkill, TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { DocumentParagraph } from '@/features/reading/reading-core';
import type { WorkspaceSessionArtifact } from '../workspace-types';
import { useWorkspaceViewState, type ExplainOrigin } from '../useWorkspaceViewState';
import { CloseReadingSplitLayout } from './CloseReadingSplitLayout';
import { HistoryWorkspace } from './HistoryWorkspace';
import { ReaderToolbar } from './ReaderToolbar';
import { ReadingSurface } from './ReadingSurface';
import { ReaderWorkspaceLayout } from './ReaderWorkspaceLayout';
import {
  WorkspaceDeleteDialog,
  type WorkspaceDeletionTarget,
} from './WorkspaceDeleteDialog';
import type { ReaderWorkspaceProps } from './reader-workspace-types';
import { ReaderAnalysisPanel } from './ReaderAnalysisPanel';

function selectCloseReadings(entries: WorkspaceSessionArtifact[], selectedId: string | null) {
  const closeReadingEntries = entries.filter(({ artifact }) => artifact.type === 'close_read');
  const defaultEntry = closeReadingEntries.find(({ anchor }) => anchor.scope === 'document') ?? null;
  const activeCloseReadingEntry = closeReadingEntries.find(
    ({ artifact }) => artifact.id === selectedId,
  ) ?? defaultEntry;
  return { closeReadingEntries, activeCloseReadingEntry };
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
  const { closeReadingEntries, activeCloseReadingEntry } = selectCloseReadings(
    reading.sessionArtifacts, view.selectedCloseReadingId,
  );
  const closeReadings = closeReadingEntries.map(({ artifact }) => artifact);

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

  const analysisDetail = (
    <ReaderAnalysisPanel
      reading={reading}
      actions={actions}
      isDesktopViewport={isDesktopViewport}
      noteEditorAnchorId={noteEditorAnchorId}
      onRunSkill={onRunSkill}
      onStartNote={onStartNote}
      onClearActiveAnchor={onClearActiveAnchor}
      onRetryArtifact={onRetryArtifact}
      view={view}
      visibleReaderLayout={visibleReaderLayout}
      activeCloseReadingEntry={activeCloseReadingEntry}
      closeReadings={closeReadings}
      selectCloseReading={selectCloseReading}
      requestDeleteAnchor={requestDeleteAnchor}
      requestDeleteArtifact={requestDeleteArtifact}
    />
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
