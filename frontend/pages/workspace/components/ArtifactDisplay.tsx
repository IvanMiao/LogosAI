import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  Copy,
  Languages,
  List,
  Loader2,
  RotateCcw,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Artifact } from '@/features/artifacts';
import type { ReaderPreferences } from '@/features/reading';
import { cn } from '@/utils/class-name';
import {
  getCloseReadingFontSize,
  getReaderFontClassName,
} from '../reading-typography';

interface ArtifactBodyProps {
  artifact: Artifact;
  variant?: 'compact' | 'reading';
  readingPreferences?: ReaderPreferences;
}

interface ArtifactTaskControlsProps {
  artifact: Artifact;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

function getArtifactProgressLabel(artifact: Artifact): string {
  if (artifact.stage === 'detect') return 'Identifying language and structure…';
  if (artifact.stage === 'correct') return 'Resolving source text…';
  if (artifact.stage === 'interpret') {
    if (artifact.type === 'translation') return 'Translating selection…';
    if (artifact.type === 'vocabulary') return 'Building vocabulary…';
    if (artifact.type === 'explanation') return 'Explaining selection…';
    return 'Interpreting the full text…';
  }
  return 'Starting analysis…';
}

export function ArtifactTypeIcon({
  type,
}: {
  type: Artifact['type'];
}): ReactElement {
  if (type === 'translation') {
    return <Languages className="h-4 w-4" />;
  }

  if (type === 'vocabulary') {
    return <List className="h-4 w-4" />;
  }

  return <Brain className="h-4 w-4" />;
}

export function ArtifactStatusIcon({ artifact }: { artifact: Artifact }): ReactElement {
  if (artifact.status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return <ArtifactTypeIcon type={artifact.type} />;
}

function ArtifactError({ artifact }: { artifact: Artifact }): ReactElement | null {
  if (!artifact.errorMessage) {
    return null;
  }

  return (
    <div role="alert" className="border-l-4 border-destructive bg-destructive/10 p-3">
      <p className="text-sm font-bold text-error-foreground">{artifact.errorMessage}</p>
      {artifact.traceId ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            void navigator.clipboard.writeText(artifact.traceId ?? '');
          }}
        >
          <Copy className="h-4 w-4" />
          Copy trace
        </Button>
      ) : null}
    </div>
  );
}

export function ArtifactBody({
  artifact,
  variant = 'compact',
  readingPreferences,
}: ArtifactBodyProps): ReactElement {
  const isReadingVariant = variant === 'reading';
  const contentClassName = cn(
    'prose max-w-none text-foreground',
    isReadingVariant
      ? cn(
        'close-reading-prose',
        getReaderFontClassName(readingPreferences?.closeReadingFontFamily ?? 'sans'),
      )
      : 'prose-sm font-sans text-sm',
  );
  const contentStyle = isReadingVariant && readingPreferences
    ? {
      fontSize: `${getCloseReadingFontSize(readingPreferences.fontSize)}px`,
      lineHeight: readingPreferences.lineSpacing,
      maxWidth: `${readingPreferences.lineWidth}px`,
      marginInline: 'auto',
    }
    : undefined;

  return (
    <div className="space-y-5">
      <ArtifactError artifact={artifact} />
      {artifact.content ? (
        <div className={contentClassName} style={contentStyle}>
          <ReactMarkdown>{artifact.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          {artifact.status === 'running' ? getArtifactProgressLabel(artifact) : 'Draft started.'}
        </p>
      )}
    </div>
  );
}

export function ArtifactTaskControls({
  artifact,
  onStopArtifact,
  onRetryArtifact,
}: ArtifactTaskControlsProps): ReactElement {
  const canRetry = artifact.status === 'failed' || artifact.status === 'stopped';

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="text-xs font-bold text-muted-foreground">{artifact.status}</span>
      {artifact.status === 'running' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Stop artifact"
          onClick={() => onStopArtifact(artifact)}
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : null}
      {canRetry ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Retry artifact"
          onClick={() => onRetryArtifact(artifact)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
