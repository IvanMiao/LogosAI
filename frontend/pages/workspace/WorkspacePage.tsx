import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { Artifact } from '@/features/artifacts';
import { useAuth } from '@/features/auth';
import { useUserSettings } from '@/features/user-settings';
import {
  DocumentLibraryDrawer,
  ImportPanel,
  ReaderWorkspace,
  WorkspaceHeader,
} from './components';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceViewport } from './useWorkspaceViewport';
import { SETTINGS_PATH } from './workspace-copy';
import type { WorkspacePageProps } from './workspace.types';

export function AuthenticatedWorkspacePage(): ReactElement {
  const auth = useAuth();
  const settings = useUserSettings();
  if (!auth.user) {
    throw new Error('AuthenticatedWorkspacePage requires an authenticated user.');
  }
  return (
    <WorkspacePage
      userId={auth.user.id}
      userName={auth.user.name}
      userEmail={auth.user.email}
      onSignOut={auth.signOut}
      hasApiKey={settings.hasApiKey}
      model={settings.model}
      cloudSyncEnabled
    />
  );
}

interface WorkspacePageComponentProps extends WorkspacePageProps {
  userName?: string;
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}

export function WorkspacePage({
  userName = 'Reader',
  userEmail = '',
  onSignOut = async () => undefined,
  ...workspaceProps
}: WorkspacePageComponentProps): ReactElement {
  const workspace = useWorkspace(workspaceProps);
  const isDesktopViewport = useWorkspaceViewport();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isDesktopContextOpen, setIsDesktopContextOpen] = useState(false);
  const [isMobileContextOpen, setIsMobileContextOpen] = useState(false);
  const [noteEditorAnchorId, setNoteEditorAnchorId] = useState<string | null>(null);

  const openContextPanel = () => {
    if (isDesktopViewport) {
      setIsDesktopContextOpen(true);
      return;
    }

    setIsMobileContextOpen(true);
  };

  const handleRunSkill = (skill: AnchorSkill) => {
    openContextPanel();
    void workspace.runAnchorSkillForActiveAnchor(skill);
  };

  const handleRunPendingSelectionSkill = (skill: AnchorSkill) => {
    openContextPanel();
    void workspace.runAnchorSkillForPendingSelection(skill);
  };

  const handleStartNote = () => {
    setNoteEditorAnchorId(workspace.activeAnchor?.id ?? null);
    openContextPanel();
  };

  const handleStartPendingSelectionNote = () => {
    const anchor = workspace.startNoteForPendingSelection();
    if (!anchor) {
      return;
    }

    setNoteEditorAnchorId(anchor.id);
    openContextPanel();
  };

  const handleClearActiveAnchor = () => {
    setNoteEditorAnchorId(null);
    workspace.clearActiveAnchor();
  };

  const handleRetryArtifact = (artifact: Artifact) => {
    void workspace.retryArtifact(artifact);
  };

  const readerWorkspaceState = workspace.activeDocument ? {
    activeDocument: workspace.activeDocument,
    activeAnchor: workspace.activeAnchor,
    anchors: workspace.anchors,
    activeArtifacts: workspace.activeArtifacts,
    activeArtifact: workspace.activeArtifact,
    sessionArtifacts: workspace.sessionArtifacts,
    artifactCountByAnchorId: workspace.artifactCountByAnchorId,
    noteDraftContent: workspace.noteDraftContent,
    artifactStageById: workspace.artifactStageById,
    anchorMarkStatusById: workspace.anchorMarkStatusById,
    readerPreferences: workspace.readerPreferences,
    analysisLanguage: workspace.analysisLanguage,
    selectionToolbarPlacement: workspace.selectionToolbarPlacement,
  } : null;
  const readerWorkspaceActions = {
    setActiveAnchorId: workspace.setActiveAnchorId,
    selectArtifact: workspace.selectArtifact,
    openSessionArtifact: workspace.openSessionArtifact,
    deleteArtifact: workspace.deleteArtifact,
    deleteAnchor: workspace.deleteAnchor,
    updateNoteDraft: workspace.updateNoteDraft,
    saveNoteDraft: workspace.saveNoteDraft,
    runCloseReadDocument: workspace.runCloseReadDocument,
    runCloseReadParagraph: workspace.runCloseReadParagraph,
    stopArtifact: workspace.stopArtifact,
    showSelectionActions: workspace.showSelectionActions,
    dismissSelectionToolbar: workspace.dismissSelectionToolbar,
    updateReaderPreference: workspace.updateReaderPreference,
    updateAnalysisLanguage: workspace.updateAnalysisLanguage,
    clearDocument: workspace.clearDocument,
    renameDocument: workspace.renameDocument,
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <WorkspaceHeader
        viewModel={workspace.viewModel}
        userName={userName}
        userEmail={userEmail}
        onSignOut={onSignOut}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onRetryCloudSync={workspace.retryCloudSync}
      />
      {workspace.workspaceError ? (
        <p role="alert" className="border-b-2 border-border bg-destructive px-4 py-2 text-center font-mono text-sm font-bold text-destructive-foreground">
          {workspace.workspaceError}
        </p>
      ) : null}
      {workspace.viewModel.cloudSyncNotice ? (
        <p role="status" className="border-b-2 border-border bg-accent px-4 py-2 text-center font-mono text-sm font-bold">
          {workspace.viewModel.cloudSyncNotice}
        </p>
      ) : null}
      {workspace.viewModel.apiKeyStatusTone === 'missing' ? (
        <p className="border-b-2 border-border bg-secondary px-4 py-2 text-center font-mono text-sm font-bold">
          Add your Gemini API key before running AI actions.{' '}
          <Link to={SETTINGS_PATH} className="underline">Open Settings</Link>
          {'. '}
          <span className="font-normal">Notes work without a key.</span>
        </p>
      ) : null}
      <main id="main-content" data-route-focus tabIndex={-1}>
        {readerWorkspaceState ? (
          <ReaderWorkspace
            reading={readerWorkspaceState}
            actions={readerWorkspaceActions}
            isDesktopViewport={isDesktopViewport}
            isDesktopContextOpen={isDesktopContextOpen}
            isMobileContextOpen={isMobileContextOpen}
            noteEditorAnchorId={noteEditorAnchorId}
            onDesktopContextOpenChange={setIsDesktopContextOpen}
            onMobileContextOpenChange={setIsMobileContextOpen}
            onRunSkill={handleRunSkill}
            onStartNote={handleStartNote}
            onRunPendingSelectionSkill={handleRunPendingSelectionSkill}
            onStartPendingSelectionNote={handleStartPendingSelectionNote}
            onClearActiveAnchor={handleClearActiveAnchor}
            onCloseNoteEditor={() => setNoteEditorAnchorId(null)}
            onRetryArtifact={handleRetryArtifact}
            onOpenLibrary={() => setIsLibraryOpen(true)}
          />
        ) : (
          <ImportPanel
            importState={workspace.importState}
            onPasteTextChange={workspace.setPasteText}
            onSessionTitleChange={workspace.setSessionTitle}
            onImportPastedText={workspace.importPastedText}
            onImportTextFile={workspace.importTextFile}
          />
        )}
      </main>
      <DocumentLibraryDrawer
        open={isLibraryOpen}
        documents={workspace.documents}
        sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
        activeDocumentId={workspace.activeDocument?.id ?? null}
        history={workspace.history}
        onOpenChange={setIsLibraryOpen}
        onOpenDocument={workspace.openDocument}
        onRenameDocument={workspace.renameDocument}
        onDeleteDocument={workspace.deleteDocument}
        onStartNewDocument={workspace.startNewDocument}
        onOpenLegacyDocument={workspace.openHistoryAsDocument}
        onDeleteHistoryItem={workspace.deleteHistoryItem}
      />
    </div>
  );
}
