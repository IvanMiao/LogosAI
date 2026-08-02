import { useState, type ReactElement } from 'react';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { Artifact } from '@/features/artifacts';
import {
  DocumentLibraryDrawer,
  ImportPanel,
  ReaderWorkspace,
  WorkspaceHeader,
} from './components';
import { useWorkspace } from './useWorkspace';
import { useWorkspaceViewport } from './useWorkspaceViewport';
import type { WorkspacePageProps } from './workspace.types';

export function WorkspacePage(props: WorkspacePageProps): ReactElement {
  const workspace = useWorkspace(props);
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

  const handleStartNote = () => {
    setNoteEditorAnchorId(workspace.activeAnchor?.id ?? null);
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
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader
        viewModel={workspace.viewModel}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />
      {workspace.workspaceError ? (
        <p role="alert" className="border-b-2 border-border bg-destructive px-4 py-2 text-center font-mono text-sm font-bold text-destructive-foreground">
          {workspace.workspaceError}
        </p>
      ) : null}
      <main>
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
