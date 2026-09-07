import { useState, type ReactElement } from 'react';
import type { Artifact } from '@/features/artifacts';
import type { AnchorSkill } from '@/features/anchors';
import type { WorkspaceDocument } from '@/features/reading';
import type { WorkspaceController } from '../workspace-types';
import type { WorkspaceAppChromeProps } from './WorkspaceHeader';
import { ReaderWorkspace } from './ReaderWorkspace';

interface WorkspaceReadingProps {
  workspace: WorkspaceController;
  activeDocument: WorkspaceDocument;
  appChrome: WorkspaceAppChromeProps;
  isDesktopViewport: boolean;
  isSessionsNavigationPinned: boolean;
  onOpenLibrary: () => void;
}

export function WorkspaceReading({
  workspace, activeDocument, appChrome, isDesktopViewport,
  isSessionsNavigationPinned, onOpenLibrary,
}: WorkspaceReadingProps): ReactElement {
  const [noteEditorAnchorId, setNoteEditorAnchorId] = useState<string | null>(null);
  const handleRunSkill = (skill: AnchorSkill) => {
    void workspace.runAnchorSkillForActiveAnchor(skill);
  };

  const handleRunPendingSelectionSkill = (skill: AnchorSkill) => {
    void workspace.runAnchorSkillForPendingSelection(skill);
  };

  const handleStartNote = () => {
    setNoteEditorAnchorId(workspace.activeAnchor?.id ?? null);
  };

  const handleStartPendingSelectionNote = () => {
    const anchor = workspace.startNoteForPendingSelection();
    if (!anchor) {
      return;
    }

    setNoteEditorAnchorId(anchor.id);
  };

  const handleClearActiveAnchor = () => {
    setNoteEditorAnchorId(null);
    workspace.clearActiveAnchor();
  };

  const handleRetryArtifact = (artifact: Artifact) => {
    void workspace.retryArtifact(artifact);
  };

  const readerWorkspaceState = {
    activeDocument,
    activeAnchor: workspace.activeAnchor,
    anchors: workspace.anchors,
    activeArtifacts: workspace.activeArtifacts,
    activeArtifact: workspace.activeArtifact,
    sessionArtifacts: workspace.sessionArtifacts,
    artifactCountByAnchorId: workspace.artifactCountByAnchorId,
    noteDraftContent: workspace.noteDraftContent,
    anchorMarkStatusById: workspace.anchorMarkStatusById,
    readerPreferences: workspace.readerPreferences,
    analysisLanguage: workspace.analysisLanguage,
    selectionToolbarPlacement: workspace.selectionToolbarPlacement,
  };
  const readerWorkspaceActions = {
    setActiveAnchorId: workspace.setActiveAnchorId,
    selectArtifact: workspace.selectArtifact,
    openSessionArtifact: workspace.openSessionArtifact,
    deleteArtifact: workspace.deleteArtifact,
    deleteAnchor: workspace.deleteAnchor,
    updateNoteDraft: workspace.updateNoteDraft,
    runCloseReadDocument: workspace.runCloseReadDocument,
    runExplainParagraph: workspace.runExplainParagraph,
    stopArtifact: workspace.stopArtifact,
    showSelectionActions: workspace.showSelectionActions,
    dismissSelectionToolbar: workspace.dismissSelectionToolbar,
    updateReaderPreference: workspace.updateReaderPreference,
    updateAnalysisLanguage: workspace.updateAnalysisLanguage,
    clearDocument: workspace.clearDocument,
    renameDocument: workspace.renameDocument,
  };

  return (
    <ReaderWorkspace
      reading={readerWorkspaceState}
      actions={readerWorkspaceActions}
      appChrome={appChrome}
      isDesktopViewport={isDesktopViewport}
      isSessionsNavigationPinned={isSessionsNavigationPinned}
      noteEditorAnchorId={noteEditorAnchorId}
      onRunSkill={handleRunSkill}
      onStartNote={handleStartNote}
      onRunPendingSelectionSkill={handleRunPendingSelectionSkill}
      onStartPendingSelectionNote={handleStartPendingSelectionNote}
      onClearActiveAnchor={handleClearActiveAnchor}
      onRetryArtifact={handleRetryArtifact}
      onOpenLibrary={onOpenLibrary}
    />
  );
}
