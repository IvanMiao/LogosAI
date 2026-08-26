import type { ReactElement } from 'react';
import {
  ArrowLeft,
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
  onShowSource: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

function getSourceScopeLabel(activeAnchor: TextAnchor): string {
  return activeAnchor.scope.charAt(0).toUpperCase() + activeAnchor.scope.slice(1);
}

function getPaneSizeClassName(mode: CloseReadingPaneMode): string {
  return mode === 'mobile' ? 'h-full min-h-0' : 'h-full min-h-0';
}

function SourceViewControl({
  mode,
  onShowSource,
}: Pick<
  CloseReadingPaneProps,
  'mode' | 'onShowSource'
>): ReactElement | null {
  if (mode !== 'mobile') return null;

  return (
    <Button type="button" size="sm" variant="outline" onClick={onShowSource}>
      <ArrowLeft className="h-4 w-4" />
      Back to source
    </Button>
  );
}

export function CloseReadingPane({
  artifact,
  closeReadings,
  activeAnchor,
  readingPreferences,
  mode,
  onShowSource,
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
      <header className="sticky top-0 z-10 flex min-h-10 items-center border-b-2 border-border bg-card px-3 py-1 font-mono sm:px-4">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ArtifactStatusIcon artifact={artifact} />
            <h2 className="truncate text-xs font-black uppercase tracking-[0.1em] sm:text-sm">
              Close Reading
            </h2>
            <span className="hidden shrink-0 border-2 border-border bg-background px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground sm:inline-flex">
              {sourceScopeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SourceViewControl
              mode={mode}
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[68ch] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <ArtifactBody
          artifact={artifact}
          variant="reading"
          readingPreferences={readingPreferences}
        />
      </div>
    </aside>
  );
}
