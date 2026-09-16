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
import { getArtifactProgressLabel } from './artifact-display-helpers';
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
  showRecoveryHint?: boolean;
  readingPreferences?: ReaderPreferences;
}

interface ArtifactTaskControlsProps {
  variant?: 'compact' | 'reading';
  artifact: Artifact;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
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

function ArtifactError({ artifact, showRecoveryHint }: { artifact: Artifact; showRecoveryHint: boolean }): ReactElement | null {
  if (!artifact.errorMessage) {
    return null;
  }

  return (
    <div role="alert" className="border-l-4 border-destructive bg-destructive/10 p-3">
      <p className="text-sm font-bold text-error-foreground">{artifact.errorMessage}</p>
      {showRecoveryHint ? <ArtifactPartialOutputNotice artifact={artifact} /> : null}
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

function ArtifactFeedback({ artifact, showRecoveryHint }: { artifact: Artifact; showRecoveryHint: boolean }): ReactElement {
  return <>
    <ArtifactError artifact={artifact} showRecoveryHint={showRecoveryHint} />
    {showRecoveryHint && !artifact.errorMessage ? <ArtifactPartialOutputNotice artifact={artifact} /> : null}
  </>;
}

export function ArtifactBody({
  artifact,
  variant = 'compact',
  showRecoveryHint = false,
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
      <ArtifactFeedback artifact={artifact} showRecoveryHint={showRecoveryHint} />
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

function ArtifactTaskButton({ action, reading, onClick }: {
  action: 'stop' | 'retry';
  reading: boolean;
  onClick: () => void;
}): ReactElement {
  const controls = { stop: { label: 'Stop', icon: Square }, retry: { label: 'Retry', icon: RotateCcw } };
  const { label, icon: Icon } = controls[action];
  return (
    <Button
      type="button" size={reading ? 'sm' : 'icon'} variant={reading ? 'outline' : 'ghost'}
      className={reading ? 'min-h-10 shrink-0 shadow-none' : undefined}
      aria-label={`${label} artifact`} onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />{reading ? label : null}
    </Button>
  );
}

function ArtifactTaskStatus({ artifact, reading }: { artifact: Artifact; reading: boolean }): ReactElement {
  return (
    <span role="status" className="min-w-0 text-xs text-muted-foreground">
      <span className={cn('font-bold', reading && 'capitalize text-foreground')}>{artifact.status}</span>
      {reading && artifact.status === 'running' ? <span className="ms-2">· {getArtifactProgressLabel(artifact)}</span> : null}
    </span>
  );
}

export function ArtifactTaskControls({
  variant = 'compact', artifact, onStopArtifact, onRetryArtifact,
}: ArtifactTaskControlsProps): ReactElement {
  const reading = variant === 'reading';
  const canRetry = artifact.status === 'failed' || artifact.status === 'stopped';
  return (
    <div className={cn('flex items-center gap-2', reading ? 'w-full justify-between' : 'shrink-0')}>
      <ArtifactTaskStatus artifact={artifact} reading={reading} />
      {artifact.status === 'running' ? (
        <ArtifactTaskButton action="stop" reading={reading} onClick={() => onStopArtifact(artifact)} />
      ) : null}
      {canRetry ? (
        <ArtifactTaskButton action="retry" reading={reading} onClick={() => onRetryArtifact(artifact)} />
      ) : null}
    </div>
  );
}

function ArtifactPartialOutputNotice({ artifact }: { artifact: Artifact }): ReactElement | null {
  if (!artifact.content || (artifact.status !== 'failed' && artifact.status !== 'stopped')) return null;
  return (
    <p className="mt-2 font-sans text-sm leading-6">
      {artifact.status === 'stopped' ? 'Stopped by you. ' : ''}Partial output is kept. Retry starts a new output.
    </p>
  );
}
