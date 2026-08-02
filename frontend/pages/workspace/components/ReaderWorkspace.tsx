import { useRef, useState, type ReactElement } from 'react';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { DocumentParagraph } from '../workspace.helpers';
import type { WorkspaceController } from '../workspace.types';
import { useWorkspacePanels } from '../useWorkspacePanels';
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

interface ReaderWorkspaceProps {
  workspace: WorkspaceController;
  isDesktopViewport: boolean;
  isDesktopContextOpen: boolean;
  isMobileContextOpen: boolean;
  noteEditorAnchorId: string | null;
  onDesktopContextOpenChange: (open: boolean) => void;
  onMobileContextOpenChange: (open: boolean) => void;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onClearActiveAnchor: () => void;
  onRetryArtifact: (artifact: Artifact) => void;
  onOpenLibrary: () => void;
}

export function ReaderWorkspace({
  workspace,
  isDesktopViewport,
  isDesktopContextOpen,
  isMobileContextOpen,
  noteEditorAnchorId,
  onDesktopContextOpenChange,
  onMobileContextOpenChange,
  onRunSkill,
  onStartNote,
  onClearActiveAnchor,
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
  const activeDocument = workspace.activeDocument;
  if (!activeDocument) {
    throw new Error('ReaderWorkspace requires an active document.');
  }

  const isNoteEditorOpen = workspace.activeAnchor?.id === noteEditorAnchorId
    || workspace.noteDraftContent.length > 0;
  const closeReadings = getCloseReadingArtifacts(workspace.activeArtifacts);
  const activeCloseReading = getDisplayedCloseReading({
    activeArtifact: workspace.activeArtifact,
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
    workspace.setActiveAnchorId(anchorId);
    panels.openPanel();
  };

  const handleCloseReadParagraph = async (paragraph: DocumentParagraph) => {
    panels.selectCloseReading(null);
    panels.openPanel();
    await workspace.runCloseReadParagraph(paragraph);
  };

  const requestDeleteAnchor = (anchor: TextAnchor) => {
    setDeletionTarget({
      kind: 'anchor',
      id: anchor.id,
      label: anchor.quote,
      scope: anchor.scope,
      outputCount: workspace.artifactCountByAnchorId[anchor.id] ?? 0,
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
      workspace.deleteAnchor(deletionTarget.id);
    } else if (deletionTarget?.kind === 'artifact') {
      workspace.deleteArtifact(deletionTarget.id);
    }
    panels.selectCloseReading(null);
    setDeletionTarget(null);
  };

  const contextPanel = (
    <ContextPanel
      activeDocument={activeDocument}
      activeAnchor={workspace.activeAnchor}
      anchors={workspace.anchors}
      activeArtifacts={workspace.activeArtifacts}
      activeArtifact={workspace.activeArtifact}
      artifactCountByAnchorId={workspace.artifactCountByAnchorId}
      noteDraftContent={workspace.noteDraftContent}
      isNoteEditorOpen={isNoteEditorOpen}
      onClearActiveAnchor={onClearActiveAnchor}
      onSelectAnchor={handleSelectAnchor}
      onSelectArtifact={workspace.selectArtifact}
      onRequestDeleteAnchor={requestDeleteAnchor}
      onRequestDeleteArtifact={requestDeleteArtifact}
      onNoteDraftChange={workspace.updateNoteDraft}
      onOpenNoteEditor={onStartNote}
      onRunSkill={onRunSkill}
      onRunCloseReadDocument={() => {
        panels.selectCloseReading(null);
        void workspace.runCloseReadDocument();
      }}
      onStopArtifact={workspace.stopArtifact}
      onRetryArtifact={onRetryArtifact}
    />
  );

  const renderCloseReadingPane = (
    mode: CloseReadingPaneMode,
  ): ReactElement | null => {
    if (!activeCloseReading || !workspace.activeAnchor) {
      return null;
    }

    return (
      <CloseReadingPane
        artifact={activeCloseReading}
        closeReadings={closeReadings}
        activeAnchor={workspace.activeAnchor}
        readingPreferences={workspace.readerPreferences}
        mode={mode}
        focusButtonRef={focusButtonRef}
        onFocus={() => panels.focusCloseReading(activeCloseReading.id)}
        onShowSource={() => panels.showSource(isCloseReadingFocused)}
        onClose={panels.closePanel}
        onSelectArtifact={panels.selectCloseReading}
        onRequestDeleteArtifact={requestDeleteArtifact}
        onStopArtifact={workspace.stopArtifact}
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
      preferences={workspace.readerPreferences}
      isIndependentScroll={isDesktopViewport && isCloseReadingOpen}
      sourceRevealRequest={panels.sourceRevealRequest}
      activeAnchor={workspace.activeAnchor}
      anchors={workspace.anchors}
      anchorMarkStatusById={workspace.anchorMarkStatusById}
      selectionToolbarPlacement={workspace.selectionToolbarPlacement}
      onCreateSelectionAnchor={workspace.createSelectionAnchor}
      onDismissSelectionToolbar={workspace.dismissSelectionToolbar}
      onRunSkill={onRunSkill}
      onStartNote={onStartNote}
      onSelectAnchor={handleSelectAnchor}
      onCloseReadParagraph={handleCloseReadParagraph}
    />
  );

  return (
    <>
      <ReaderToolbar
        activeDocument={activeDocument}
        preferences={workspace.readerPreferences}
        analysisLanguage={workspace.analysisLanguage}
        isContextPanelOpen={panels.isContextOpen}
        isDeepReadingOpen={isCloseReadingOpen}
        onPreferenceChange={workspace.updateReaderPreference}
        onAnalysisLanguageChange={workspace.updateAnalysisLanguage}
        onContextPanelToggle={panels.togglePanel}
        onClearDocument={workspace.clearDocument}
        onOpenLibrary={onOpenLibrary}
        onRenameDocument={(title) => workspace.renameDocument(activeDocument.id, title)}
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
