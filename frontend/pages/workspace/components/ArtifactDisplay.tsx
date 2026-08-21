import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  Brain,
  Check,
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
import { cn } from '@/utils/className';
import {
  getCloseReadingFontSize,
  getReaderFontClassName,
} from '../reading-typography';
import { MISSING_API_KEY_MESSAGE, SETTINGS_PATH } from '../workspace-copy';
import { getArtifactStatusLabel } from './artifact-display.helpers';

interface ArtifactBodyProps {
  artifact: Artifact;
  variant?: 'compact' | 'reading';
  readingPreferences?: ReaderPreferences;
  stageLabel?: string;
}

interface ArtifactTaskControlsProps {
  artifact: Artifact;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

const COPY_STATUS_RESET_MS = 1_800;

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

  const isMissingApiKey = artifact.errorMessage === MISSING_API_KEY_MESSAGE;

  return (
    <div role="alert" className="border-l-4 border-destructive bg-destructive/10 p-3">
      <p className="text-sm font-bold text-error-foreground">{artifact.errorMessage}</p>
      {isMissingApiKey ? (
        <Link
          to={SETTINGS_PATH}
          className="mt-2 inline-flex min-h-11 items-center font-bold text-link underline"
        >
          Open Settings
        </Link>
      ) : null}
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

function getEmptyBodyMessage(artifact: Artifact): string {
  if (artifact.type === 'note') {
    return 'Write a note to keep alongside this passage.';
  }
  if (artifact.status === 'stopped') {
    return 'Stopped before any text arrived. Retry to run it again.';
  }
  if (artifact.status === 'failed') {
    return 'No text was produced. Retry to run it again.';
  }

  return 'No content yet.';
}

export function ArtifactBody({
  artifact,
  variant = 'compact',
  readingPreferences,
  stageLabel,
}: ArtifactBodyProps): ReactElement {
  const isReadingVariant = variant === 'reading';
  const isRunning = artifact.status === 'running';
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
    }
    : undefined;

  return (
    <div className="space-y-5">
      <ArtifactError artifact={artifact} />
      {isRunning ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm leading-6 text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          {stageLabel ?? 'Reading closely…'}
        </p>
      ) : null}
      {artifact.content ? (
        <div className={contentClassName} style={contentStyle}>
          <ReactMarkdown>{artifact.content}</ReactMarkdown>
        </div>
      ) : null}
      {!artifact.content && !isRunning ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {getEmptyBodyMessage(artifact)}
        </p>
      ) : null}
    </div>
  );
}

export function ArtifactCopyButton({
  artifact,
  contentLabel,
}: {
  artifact: Artifact;
  contentLabel: string;
}): ReactElement {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const label = copyStatus === 'copied'
    ? `${contentLabel} copied`
    : copyStatus === 'failed'
      ? `Copy ${contentLabel} failed`
      : `Copy ${contentLabel}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(
      () => setCopyStatus('idle'),
      COPY_STATUS_RESET_MS,
    );
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-9 w-9"
      aria-label={label}
      title={label}
      disabled={!artifact.content}
      onClick={() => {
        void handleCopy();
      }}
    >
      {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : null}
      {copyStatus === 'failed' ? <AlertTriangle className="h-4 w-4" /> : null}
      {copyStatus === 'idle' ? <Copy className="h-4 w-4" /> : null}
    </Button>
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
      <span className="text-xs font-bold text-muted-foreground">
        {getArtifactStatusLabel(artifact.status)}
      </span>
      {artifact.status === 'running' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Stop generating"
          title="Stop generating"
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
          aria-label="Try again"
          title="Try again"
          onClick={() => onRetryArtifact(artifact)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
