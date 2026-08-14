import { useState, type ReactElement } from 'react';
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
      <main id="main-content" data-route-focus tabIndex={-1}>
        {workspace.activeDocument ? (
          <ReaderWorkspace
            workspace={workspace}
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
            onRetryArtifact={handleRetryArtifact}
            onOpenLibrary={() => setIsLibraryOpen(true)}
          />
        ) : (
          <ImportPanel
            importState={workspace.importState}
            onPasteTextChange={workspace.setPasteText}
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
