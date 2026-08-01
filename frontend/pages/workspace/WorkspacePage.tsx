import { useState, type ReactElement } from 'react';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { Artifact } from '@/features/artifacts';
import {
  HistoryDrawer,
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
        onOpenHistory={() => setIsHistoryOpen(true)}
      />
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
      <HistoryDrawer
        open={isHistoryOpen}
        history={workspace.history}
        onOpenChange={setIsHistoryOpen}
        onOpenAsDocument={workspace.openHistoryAsDocument}
        onDeleteHistoryItem={workspace.deleteHistoryItem}
      />
    </div>
  );
}
