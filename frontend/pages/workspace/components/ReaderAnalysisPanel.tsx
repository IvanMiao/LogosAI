import type { ReactElement } from 'react';
import { ScanText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Artifact } from '@/features/artifacts';
import type { TextAnchor } from '@/features/anchors';
import type { WorkspaceSessionArtifact } from '../workspace-types';
import type { useWorkspaceViewState, ReaderLayout } from '../useWorkspaceViewState';
import type { ReaderWorkspaceProps, ReaderWorkspaceState } from './reader-workspace-types';
import { CloseReadingPane, type CloseReadingPaneMode } from './CloseReadingPane';
import { CurrentExplainPanel } from './CurrentExplainPanel';

interface ReaderAnalysisPanelProps extends Pick<ReaderWorkspaceProps,
  'reading' | 'actions' | 'isDesktopViewport' | 'noteEditorAnchorId'
  | 'onRunSkill' | 'onStartNote' | 'onClearActiveAnchor' | 'onRetryArtifact'
> {
  view: ReturnType<typeof useWorkspaceViewState>;
  visibleReaderLayout: ReaderLayout;
  activeCloseReadingEntry: WorkspaceSessionArtifact | null;
  closeReadings: Artifact[];
  selectCloseReading: (artifactId?: string) => void;
  requestDeleteAnchor: (anchor: TextAnchor) => void;
  requestDeleteArtifact: (artifact: Artifact) => void;
}

function CloseReadingEmptyState({ onStart }: { onStart: () => void }): ReactElement {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[#fbfbf8]">
      <header className="flex min-h-10 items-center border-b-2 border-border bg-card px-4 py-1 font-mono">
        <h2 className="text-xs font-black uppercase tracking-[0.1em] sm:text-sm">
          Close Reading
        </h2>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="max-w-md border-2 border-border bg-card p-6 text-center shadow-[4px_4px_0px_0px_var(--border)]">
          <ScanText className="mx-auto h-7 w-7" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-black">Read the whole text closely</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Close Reading builds a structured, in-depth interpretation of the entire document.
          </p>
          <Button type="button" className="mt-5" onClick={onStart}>
            Start Close Reading
          </Button>
        </div>
      </div>
    </section>
  );
}

function getExplainArtifacts(reading: ReaderWorkspaceState): Artifact[] {
  return reading.activeArtifacts.filter((artifact) => artifact.type !== 'close_read');
}

function getActiveExplainArtifact(reading: ReaderWorkspaceState): Artifact | null {
  if (reading.activeArtifact?.type !== 'close_read') return reading.activeArtifact;
  return getExplainArtifacts(reading)[0] ?? null;
}

function getPaneMode(isDesktop: boolean, layout: ReaderLayout): CloseReadingPaneMode {
  if (!isDesktop) return 'mobile';
  return layout === 'analysis' ? 'focus' : 'split';
}

export function ReaderAnalysisPanel({
  reading, actions, isDesktopViewport, noteEditorAnchorId, onRunSkill, onStartNote,
  onClearActiveAnchor, onRetryArtifact, view, visibleReaderLayout,
  activeCloseReadingEntry, closeReadings, selectCloseReading,
  requestDeleteAnchor, requestDeleteArtifact,
}: ReaderAnalysisPanelProps): ReactElement {
  const isNoteEditorOpen = reading.activeAnchor?.id === noteEditorAnchorId
    || reading.noteDraftContent.length > 0;
  const currentExplainPanel = reading.activeAnchor ? (
    <CurrentExplainPanel
      activeAnchor={reading.activeAnchor}
      artifacts={getExplainArtifacts(reading)}
      activeArtifact={getActiveExplainArtifact(reading)}
      readingPreferences={reading.readerPreferences}
      noteDraftContent={reading.noteDraftContent}
      isNoteEditorOpen={isNoteEditorOpen}
      backLabel={view.explainOrigin === 'analysis' ? 'Back to Close Reading' : undefined}
      onBack={view.explainOrigin === 'analysis' ? view.closeExplain : undefined}
      onClose={() => {
        view.closeExplain();
        onClearActiveAnchor();
      }}
      onSelectArtifact={actions.selectArtifact}
      onRequestDeleteAnchor={requestDeleteAnchor}
      onRequestDeleteArtifact={requestDeleteArtifact}
      onNoteDraftChange={actions.updateNoteDraft}
      onOpenNoteEditor={onStartNote}
      onRunSkill={onRunSkill}
      onStopArtifact={actions.stopArtifact}
      onRetryArtifact={onRetryArtifact}
    />
  ) : null;

  const renderCloseReadingPane = (mode: CloseReadingPaneMode): ReactElement | null => {
    if (!activeCloseReadingEntry) return null;
    const { artifact, anchor } = activeCloseReadingEntry;
    return (
      <CloseReadingPane
        artifact={artifact}
        closeReadings={closeReadings}
        activeAnchor={anchor}
        readingPreferences={reading.readerPreferences}
        mode={mode}
        onShowSource={() => {
          view.openReaderLayout('source');
          view.revealSource();
        }}
        onSelectArtifact={selectCloseReading}
        onRequestDeleteArtifact={requestDeleteArtifact}
        onStopArtifact={actions.stopArtifact}
        onRetryArtifact={onRetryArtifact}
      />
    );
  };

  const startCloseReading = () => {
    void actions.runCloseReadDocument();
  };
  const closeReadingDetail = view.isExplainOpen && currentExplainPanel
    ? currentExplainPanel
    : renderCloseReadingPane(
      getPaneMode(isDesktopViewport, visibleReaderLayout),
    );
  return closeReadingDetail ?? (
    <CloseReadingEmptyState onStart={startCloseReading} />
  );
}
