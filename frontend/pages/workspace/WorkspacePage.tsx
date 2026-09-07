import { useContext, useState, type ReactElement } from 'react';
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
import { ReadingViewProvider } from './components/ReadingViewProvider';
import { ReadingViewContext } from './reading-view-context';
import { useWorkspaceNavigation } from './useWorkspaceNavigation';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceViewport } from './useWorkspaceViewport';
import type { WorkspaceAppChromeProps } from './components/WorkspaceHeader';
import type { WorkspaceController, WorkspacePageProps } from './workspace-types';

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

export function WorkspacePage(props: WorkspacePageComponentProps): ReactElement {
  return (
    <ReadingViewProvider key={props.userId} userId={props.userId}>
      <WorkspacePageContent {...props} />
    </ReadingViewProvider>
  );
}

function WorkspacePageContent({
  userName = 'Reader',
  userEmail = '',
  onSignOut = async () => undefined,
  ...workspaceProps
}: WorkspacePageComponentProps): ReactElement {
  const workspace = useWorkspace(workspaceProps);
  const navigation = useWorkspaceNavigation(workspace, Boolean(workspaceProps.cloudSyncEnabled));
  const viewStorage = useContext(ReadingViewContext);
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
      error={workspace.workspaceError || readingSaveError(viewStorage)}
      sidebar={isSessionsNavigationPinned ? (
        <PinnedSessionsSidebar
          documents={workspace.documents}
          sessionStatsByDocumentId={workspace.sessionStatsByDocumentId}
          activeDocumentId={activeDocumentId}
          onCollapse={() => updateSessionsPinned(false)}
          onOpenDocument={navigation.openDocument}
          onRenameDocument={workspace.renameDocument}
          onDeleteDocument={workspace.deleteDocument}
          onStartNewDocument={navigation.startNewDocument}
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
          onOpenDocument={navigation.openDocument}
          onRenameDocument={workspace.renameDocument}
          onDeleteDocument={workspace.deleteDocument}
          onStartNewDocument={navigation.startNewDocument}
          onOpenLegacyDocument={workspace.openHistoryAsDocument}
          onDeleteHistoryItem={workspace.deleteHistoryItem}
        />
      }
    >
      <WorkspaceBody
        workspace={workspace}
        navigation={navigation}
        appChrome={appChrome}
        isDesktopViewport={isDesktopViewport}
        isSessionsNavigationPinned={isSessionsNavigationPinned}
        onOpenLibrary={toggleSessionsNavigation}
      />
    </WorkspacePageLayout>
  );
}

function readingSaveError(context: React.ContextType<typeof ReadingViewContext>): string {
  return context?.saveFailed
    ? 'Reading position could not be saved on this device. Keep this page open to retain your place.'
    : '';
}

interface WorkspaceBodyProps {
  workspace: WorkspaceController;
  navigation: ReturnType<typeof useWorkspaceNavigation>;
  appChrome: WorkspaceAppChromeProps;
  isDesktopViewport: boolean;
  isSessionsNavigationPinned: boolean;
  onOpenLibrary: () => void;
}

function WorkspaceBody({
  workspace, navigation, appChrome, isDesktopViewport, isSessionsNavigationPinned, onOpenLibrary,
}: WorkspaceBodyProps): ReactElement {
  return <>
      {navigation.loading ? (
        <p role="status" className="p-6">Opening reading…</p>
      ) : navigation.unavailable ? (
        <div className="p-6" role="status">
          <p>This reading is unavailable on this device. It may have been deleted or belong to another account.</p>
          <button type="button" className="mt-4 underline" onClick={() => onOpenLibrary()}>Open reading sessions</button>
          <button type="button" className="ms-4 underline" onClick={workspace.retryCloudSync}>Retry cloud sync</button>
        </div>
      ) : workspace.activeDocument ? (
        <div className="min-h-0 flex-1">
          <WorkspaceReading
            key={workspace.activeDocument.id}
            workspace={workspace}
            activeDocument={workspace.activeDocument}
            appChrome={appChrome}
            isDesktopViewport={isDesktopViewport}
            isSessionsNavigationPinned={isSessionsNavigationPinned}
            onOpenLibrary={onOpenLibrary}
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
          <SiteFooter source="workspace" />
        </>
      )}
  </>;
}
