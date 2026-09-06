import { useState, type ReactElement } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { useAuth } from '@/features/auth';
import { useUserSettings } from '@/features/user-settings';
import {
  DocumentLibraryDrawer,
  ImportPanel,
  PinnedSessionsSidebar,
} from './components';
import { WorkspacePageLayout } from './components/WorkspacePageLayout';
import { WorkspaceReading } from './components/WorkspaceReading';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceViewport } from './useWorkspaceViewport';
import type { WorkspacePageProps } from './workspace-types';

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
  const updateSessionsPinned = (pinned: boolean) => {
    setIsSessionsPinned(pinned);
    window.localStorage.setItem(sessionsPinnedStorageKey, String(pinned));
  };

  const isSessionsNavigationPinned = isDesktopViewport && isSessionsPinned;
  const toggleSessionsNavigation = () => {
    if (isSessionsNavigationPinned) updateSessionsPinned(false);
    else setIsLibraryOpen(true);
  };
  const appChrome = {
    viewModel: workspace.viewModel,
    userName,
    userEmail,
    onSignOut,
    onOpenLibrary: () => setIsLibraryOpen(true),
    onRetryCloudSync: workspace.retryCloudSync,
  };

  const activeDocumentId = workspace.activeDocument?.id ?? null;
  return (
    <WorkspacePageLayout
      appChrome={appChrome}
      isReading={Boolean(workspace.activeDocument)}
      error={workspace.workspaceError}
      sidebar={isSessionsNavigationPinned ? (
        <PinnedSessionsSidebar
          documents={workspace.documents}
          sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
          activeDocumentId={activeDocumentId}
          onCollapse={() => updateSessionsPinned(false)}
          onOpenDocument={workspace.openDocument}
          onRenameDocument={workspace.renameDocument}
          onDeleteDocument={workspace.deleteDocument}
          onStartNewDocument={workspace.startNewDocument}
        />
      ) : null}
      library={
        <DocumentLibraryDrawer
          open={isLibraryOpen}
          documents={workspace.documents}
          sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
          activeDocumentId={activeDocumentId}
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
      }
    >
      {workspace.activeDocument ? (
        <div className="min-h-0 flex-1">
          <WorkspaceReading
            key={workspace.activeDocument.id}
            workspace={workspace}
            activeDocument={workspace.activeDocument}
            appChrome={appChrome}
            isDesktopViewport={isDesktopViewport}
            isSessionsNavigationPinned={isSessionsNavigationPinned}
            onOpenLibrary={toggleSessionsNavigation}
          />
        </div>
      ) : (
        <>
          <ImportPanel
            importState={workspace.importState}
            onPasteTextChange={workspace.setPasteText}
            onSessionTitleChange={workspace.setSessionTitle}
            onImportPastedText={workspace.importPastedText}
            onImportTextFile={workspace.importTextFile}
          />
        </>
      )}
      <SiteFooter source="workspace" />
    </WorkspacePageLayout>
  );
}
