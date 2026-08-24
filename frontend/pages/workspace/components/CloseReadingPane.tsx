import type { ReactElement, Ref } from 'react';
import {
  ArrowLeft,
  Columns2,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { ReaderPreferences } from '@/features/reading';
import { cn } from '@/utils/class-name';
import {
  ArtifactBody,
  ArtifactStatusIcon,
  ArtifactTaskControls,
} from './ArtifactDisplay';
import { CloseReadingActions } from './CloseReadingActions';

export type CloseReadingPaneMode = 'split' | 'focus' | 'mobile';

interface CloseReadingPaneProps {
  artifact: Artifact;
  closeReadings: Artifact[];
  activeAnchor: TextAnchor;
  readingPreferences: ReaderPreferences;
  mode: CloseReadingPaneMode;
  focusButtonRef?: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onShowSource: () => void;
  onClose: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

function getSourceScopeLabel(activeAnchor: TextAnchor): string {
  return activeAnchor.scope.charAt(0).toUpperCase() + activeAnchor.scope.slice(1);
}

function getPaneSizeClassName(mode: CloseReadingPaneMode): string {
  if (mode === 'focus') {
    return 'h-[100dvh]';
  }

  return mode === 'split' ? 'h-full min-h-0 border-r-2' : 'h-full min-h-0';
}

function SourceViewControl({
  mode,
  focusButtonRef,
  onFocus,
  onShowSource,
}: Pick<
  CloseReadingPaneProps,
  'mode' | 'focusButtonRef' | 'onFocus' | 'onShowSource'
>): ReactElement {
  if (mode === 'mobile') {
    return (
      <Button type="button" size="sm" variant="outline" onClick={onShowSource}>
        <ArrowLeft className="h-4 w-4" />
        Back to text
      </Button>
    );
  }

  if (mode === 'focus') {
    return (
      <Button type="button" size="sm" variant="outline" onClick={onShowSource}>
        <Columns2 className="h-4 w-4" />
        Show source
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="hidden xl:inline-flex"
        ref={focusButtonRef}
        onClick={onFocus}
      >
        <Maximize2 className="h-4 w-4" />
        Focus analysis
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="xl:hidden"
        onClick={onShowSource}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to text
      </Button>
    </>
  );
}

export function CloseReadingPane({
  artifact,
  closeReadings,
  activeAnchor,
  readingPreferences,
  mode,
  focusButtonRef,
  onFocus,
  onShowSource,
  onClose,
  onSelectArtifact,
  onRequestDeleteArtifact,
  onStopArtifact,
  onRetryArtifact,
}: CloseReadingPaneProps): ReactElement {
  const sourceScopeLabel = getSourceScopeLabel(activeAnchor);
  const showTaskControls = artifact.status !== 'complete';
  const paneClassName = cn(
    'overflow-y-auto border-border bg-[#fbfbf8]',
    getPaneSizeClassName(mode),
  );

  return (
    <aside aria-label="Close reading" className={paneClassName}>
      <header className="sticky top-0 z-10 border-b-2 border-border bg-card px-3 py-1.5 font-mono sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ArtifactStatusIcon artifact={artifact} />
            <h2 className="truncate text-xs font-black uppercase tracking-[0.1em] sm:text-sm">
              <span className={mode === 'focus' ? '' : 'hidden'}>Close Reading</span>
              <span className={mode === 'focus' ? 'hidden' : ''}>Analysis</span>
            </h2>
            <span className="hidden shrink-0 border-2 border-border bg-background px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground sm:inline-flex">
              {sourceScopeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SourceViewControl
              mode={mode}
              focusButtonRef={focusButtonRef}
              onFocus={onFocus}
              onShowSource={onShowSource}
            />
            <CloseReadingActions
              key={artifact.id}
              artifact={artifact}
              closeReadings={closeReadings}
              onSelectArtifact={onSelectArtifact}
              onRequestDeleteArtifact={onRequestDeleteArtifact}
            />
            {showTaskControls ? (
              <ArtifactTaskControls
                artifact={artifact}
                onStopArtifact={onStopArtifact}
                onRetryArtifact={onRetryArtifact}
              />
            ) : null}
            {mode !== 'mobile' ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                aria-label="Close analysis"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[68ch] px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
        <ArtifactBody
          artifact={artifact}
          variant="reading"
          readingPreferences={readingPreferences}
        />
      </div>
    </aside>
  );
}
