import { useState, type ReactElement } from 'react';
import type { Artifact } from '@/features/artifacts';
import type { AnchorSkill } from '@/features/anchors';
import { SiteFooter } from '@/components/SiteFooter';
import { useAuth } from '@/features/auth';
import { useUserSettings } from '@/features/user-settings';
import {
  DocumentLibraryDrawer,
  ImportPanel,
  PinnedSessionsSidebar,
  ReaderWorkspace,
  WorkspaceHeader,
} from './components';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceViewport } from './useWorkspaceViewport';
import type { WorkspacePageProps } from './workspace-types';
import { cn } from '@/utils/class-name';

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
  const sessionsPinnedStorageKey = `logosai.workspace.sessionsPinned:v1:${workspaceProps.userId}`;
  const [isSessionsPinned, setIsSessionsPinned] = useState(() => (
    window.localStorage.getItem(sessionsPinnedStorageKey) === 'true'
  ));
  const [noteEditorAnchorId, setNoteEditorAnchorId] = useState<string | null>(null);

  const updateSessionsPinned = (pinned: boolean) => {
    setIsSessionsPinned(pinned);
    window.localStorage.setItem(sessionsPinnedStorageKey, String(pinned));
  };

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

  const readerWorkspaceState = workspace.activeDocument ? {
    activeDocument: workspace.activeDocument,
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
  } : null;
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
    <div className={cn(
      'bg-background text-foreground',
      workspace.activeDocument
        ? 'flex h-dvh min-h-0 flex-col overflow-hidden'
        : 'min-h-dvh',
    )}>
      {!workspace.activeDocument ? (
        <WorkspaceHeader
          viewModel={workspace.viewModel}
          userName={userName}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onRetryCloudSync={workspace.retryCloudSync}
        />
      ) : null}
      {workspace.workspaceError ? (
        <p role="alert" className="border-b-2 border-border bg-destructive px-4 py-2 text-center font-mono text-sm font-bold text-destructive-foreground">
          {workspace.workspaceError}
        </p>
      ) : null}
      <div className={cn(
        'flex min-w-0 items-start',
        workspace.activeDocument ? 'min-h-0 flex-1 items-stretch' : '',
      )}>
        {isDesktopViewport && isSessionsPinned ? (
          <PinnedSessionsSidebar
            documents={workspace.documents}
            sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
            activeDocumentId={workspace.activeDocument?.id ?? null}
            onCollapse={() => updateSessionsPinned(false)}
            onOpenDocument={workspace.openDocument}
            onRenameDocument={workspace.renameDocument}
            onDeleteDocument={workspace.deleteDocument}
            onStartNewDocument={workspace.startNewDocument}
          />
        ) : null}
        <main
          id="main-content"
          data-route-focus
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1',
            workspace.activeDocument ? 'h-full min-h-0' : '',
          )}
        >
          {readerWorkspaceState ? (
            <ReaderWorkspace
              key={readerWorkspaceState.activeDocument.id}
              reading={readerWorkspaceState}
              actions={readerWorkspaceActions}
              appChrome={{
                viewModel: workspace.viewModel,
                userName,
                userEmail,
                onSignOut,
                onOpenLibrary: () => setIsLibraryOpen(true),
                onRetryCloudSync: workspace.retryCloudSync,
              }}
              isDesktopViewport={isDesktopViewport}
              isSessionsNavigationPinned={isDesktopViewport && isSessionsPinned}
              noteEditorAnchorId={noteEditorAnchorId}
              onRunSkill={handleRunSkill}
              onStartNote={handleStartNote}
              onRunPendingSelectionSkill={handleRunPendingSelectionSkill}
              onStartPendingSelectionNote={handleStartPendingSelectionNote}
              onClearActiveAnchor={handleClearActiveAnchor}
              onRetryArtifact={handleRetryArtifact}
              onOpenLibrary={() => {
                if (isDesktopViewport && isSessionsPinned) updateSessionsPinned(false);
                else setIsLibraryOpen(true);
              }}
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
          <SiteFooter source="workspace" />
        </main>
      </div>
      <DocumentLibraryDrawer
        open={isLibraryOpen}
        documents={workspace.documents}
        sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
        activeDocumentId={workspace.activeDocument?.id ?? null}
        history={workspace.history}
        canPin={isDesktopViewport && !isSessionsPinned}
        onOpenChange={setIsLibraryOpen}
        onPin={() => {
          updateSessionsPinned(true);
          setIsLibraryOpen(false);
        }}
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
