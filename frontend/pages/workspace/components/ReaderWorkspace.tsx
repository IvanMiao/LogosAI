import { useRef, useState, type ReactElement } from 'react';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { TextAnchor } from '@/features/anchors';
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
} from '../workspace.types';
import { useWorkspacePanels } from '../useWorkspacePanels';
import { getStageLabel } from '../workspace-copy';
import { CloseReadingPane, type CloseReadingPaneMode } from './CloseReadingPane';
import {
  getCloseReadingArtifacts,
  getDisplayedCloseReading,
} from './close-reading.helpers';
import { ContextPanel } from './ContextPanel';
import { FocusedCloseReadingDialog } from './FocusedCloseReadingDialog';
import { MobileWorkspaceDialog } from './MobileWorkspaceDialog';
import { ReaderToolbar } from './ReaderToolbar';
import { ReadingSurface } from './ReadingSurface';
import { ReaderWorkspaceLayout } from './ReaderWorkspaceLayout';
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
  artifactStageById: Record<string, string>;
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
  saveNoteDraft: () => void;
  runCloseReadDocument: () => Promise<void>;
  runCloseReadParagraph: (paragraph: DocumentParagraph) => Promise<void>;
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
  reading: ReaderWorkspaceState;
  actions: ReaderWorkspaceActions;
  isDesktopViewport: boolean;
  isDesktopContextOpen: boolean;
  isMobileContextOpen: boolean;
  noteEditorAnchorId: string | null;
  onDesktopContextOpenChange: (open: boolean) => void;
  onMobileContextOpenChange: (open: boolean) => void;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onRunPendingSelectionSkill: (skill: AnchorSkill) => void;
  onStartPendingSelectionNote: () => void;
  onClearActiveAnchor: () => void;
  onCloseNoteEditor: () => void;
  onRetryArtifact: (artifact: Artifact) => void;
  onOpenLibrary: () => void;
}

export function ReaderWorkspace({
  reading,
  actions,
  isDesktopViewport,
  isDesktopContextOpen,
  isMobileContextOpen,
  noteEditorAnchorId,
  onDesktopContextOpenChange,
  onMobileContextOpenChange,
  onRunSkill,
  onStartNote,
  onRunPendingSelectionSkill,
  onStartPendingSelectionNote,
  onClearActiveAnchor,
  onCloseNoteEditor,
  onRetryArtifact,
  onOpenLibrary,
}: ReaderWorkspaceProps): ReactElement {
  const panels = useWorkspacePanels({
    isDesktopViewport,
    isDesktopContextOpen,
    isMobileContextOpen,
    onDesktopContextOpenChange,
    onMobileContextOpenChange,
  });
  const focusButtonRef = useRef<HTMLButtonElement | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<WorkspaceDeletionTarget | null>(null);
  const { activeDocument } = reading;

  const isNoteEditorOpen = reading.activeAnchor?.id === noteEditorAnchorId
    || reading.noteDraftContent.length > 0;
  const activeArtifactStage = getStageLabel(
    reading.activeArtifact ? reading.artifactStageById[reading.activeArtifact.id] : undefined,
  );

  const handleSaveNote = () => {
    actions.saveNoteDraft();
    onCloseNoteEditor();
  };

  const closeReadings = getCloseReadingArtifacts(reading.activeArtifacts);
  const activeCloseReading = getDisplayedCloseReading({
    activeArtifact: reading.activeArtifact,
    closeReadings,
    selectedArtifactId: panels.selectedCloseReadingId,
  });
  const isCloseReadingOpen = panels.isContextOpen && activeCloseReading !== null;
  const isCloseReadingFocused = activeCloseReading?.id === panels.focusedCloseReadingId;

  const handleFocusedDialogOpenChange = (open: boolean) => {
    if (!open) {
      panels.exitFocus();
    }
  };

  const handleSelectAnchor = (anchorId: string) => {
    panels.selectCloseReading(null);
    actions.setActiveAnchorId(anchorId);
    panels.openPanel();
  };

  const handleOpenSessionArtifact = (artifactId: string) => {
    panels.selectCloseReading(null);
    actions.openSessionArtifact(artifactId);
    panels.openPanel();
  };

  const handleCloseReadParagraph = async (paragraph: DocumentParagraph) => {
    panels.selectCloseReading(null);
    panels.openPanel();
    await actions.runCloseReadParagraph(paragraph);
  };

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
    setDeletionTarget({
      kind: 'artifact',
      id: artifact.id,
      label: artifact.content || artifact.title,
    });
  };

  const confirmDeletion = () => {
    if (deletionTarget?.kind === 'anchor') {
      actions.deleteAnchor(deletionTarget.id);
    } else if (deletionTarget?.kind === 'artifact') {
      actions.deleteArtifact(deletionTarget.id);
    }
    panels.selectCloseReading(null);
    setDeletionTarget(null);
  };

  const contextPanel = (
    <ContextPanel
      activeDocument={activeDocument}
      activeAnchor={reading.activeAnchor}
      anchors={reading.anchors}
      activeArtifacts={reading.activeArtifacts}
      activeArtifact={reading.activeArtifact}
      sessionArtifacts={reading.sessionArtifacts}
      artifactCountByAnchorId={reading.artifactCountByAnchorId}
      noteDraftContent={reading.noteDraftContent}
      isNoteEditorOpen={isNoteEditorOpen}
      readingPreferences={reading.readerPreferences}
      activeArtifactStage={activeArtifactStage}
      onClearActiveAnchor={onClearActiveAnchor}
      onSelectAnchor={handleSelectAnchor}
      onSelectArtifact={actions.selectArtifact}
      onOpenSessionArtifact={handleOpenSessionArtifact}
      onRequestDeleteAnchor={requestDeleteAnchor}
      onRequestDeleteArtifact={requestDeleteArtifact}
      onNoteDraftChange={actions.updateNoteDraft}
      onOpenNoteEditor={onStartNote}
      onSaveNote={handleSaveNote}
      onRunSkill={onRunSkill}
      onRunCloseReadDocument={() => {
        panels.selectCloseReading(null);
        void actions.runCloseReadDocument();
      }}
      onStopArtifact={actions.stopArtifact}
      onRetryArtifact={onRetryArtifact}
    />
  );

  const renderCloseReadingPane = (
    mode: CloseReadingPaneMode,
  ): ReactElement | null => {
    if (!activeCloseReading || !reading.activeAnchor) {
      return null;
    }

    return (
      <CloseReadingPane
        artifact={activeCloseReading}
        closeReadings={closeReadings}
        activeAnchor={reading.activeAnchor}
        readingPreferences={reading.readerPreferences}
        stageLabel={getStageLabel(reading.artifactStageById[activeCloseReading.id])}
        mode={mode}
        focusButtonRef={focusButtonRef}
        onFocus={() => panels.focusCloseReading(activeCloseReading.id)}
        onShowSource={() => panels.showSource(isCloseReadingFocused)}
        onClose={panels.closePanel}
        onSelectArtifact={panels.selectCloseReading}
        onRequestDeleteArtifact={requestDeleteArtifact}
        onStopArtifact={actions.stopArtifact}
        onRetryArtifact={(artifact) => {
          panels.selectCloseReading(null);
          onRetryArtifact(artifact);
        }}
      />
    );
  };

  const readingSurface = (
    <ReadingSurface
      activeDocument={activeDocument}
      preferences={reading.readerPreferences}
      isIndependentScroll={isDesktopViewport && isCloseReadingOpen}
      sourceRevealRequest={panels.sourceRevealRequest}
      activeAnchor={reading.activeAnchor}
      anchors={reading.anchors}
      anchorMarkStatusById={reading.anchorMarkStatusById}
      selectionToolbarPlacement={reading.selectionToolbarPlacement}
      onShowSelectionActions={actions.showSelectionActions}
      onDismissSelectionToolbar={actions.dismissSelectionToolbar}
      onRunSkill={onRunPendingSelectionSkill}
      onStartNote={onStartPendingSelectionNote}
      onSelectAnchor={handleSelectAnchor}
      onCloseReadParagraph={handleCloseReadParagraph}
    />
  );

  return (
    <>
      <h1 className="sr-only">{activeDocument.title}</h1>
      <ReaderToolbar
        activeDocument={activeDocument}
        preferences={reading.readerPreferences}
        analysisLanguage={reading.analysisLanguage}
        isContextPanelOpen={panels.isContextOpen}
        isDeepReadingOpen={isCloseReadingOpen}
        onPreferenceChange={actions.updateReaderPreference}
        onAnalysisLanguageChange={actions.updateAnalysisLanguage}
        onContextPanelToggle={panels.togglePanel}
        onClearDocument={actions.clearDocument}
        onOpenLibrary={onOpenLibrary}
        onRenameDocument={(title) => actions.renameDocument(activeDocument.id, title)}
      />
      {isDesktopViewport ? (
        <>
          <ReaderWorkspaceLayout
            readingSurface={readingSurface}
            contextPanel={contextPanel}
            closeReadingPane={renderCloseReadingPane('split')}
            isContextOpen={isDesktopContextOpen}
          />
          <FocusedCloseReadingDialog
            open={isCloseReadingFocused}
            closeReadingPane={isCloseReadingFocused
              ? renderCloseReadingPane('focus')
              : null}
            onOpenChange={handleFocusedDialogOpenChange}
            onReturnFocus={() => focusButtonRef.current?.focus()}
          />
        </>
      ) : readingSurface}
      {!isDesktopViewport ? (
        <MobileWorkspaceDialog
          open={isMobileContextOpen}
          activeCloseReading={activeCloseReading}
          contextPanel={contextPanel}
          closeReadingPane={renderCloseReadingPane('mobile')}
          onOpenChange={onMobileContextOpenChange}
        />
      ) : null}
      <WorkspaceDeleteDialog
        target={deletionTarget}
        onCancel={() => setDeletionTarget(null)}
        onConfirm={confirmDeletion}
      />
    </>
  );
}
