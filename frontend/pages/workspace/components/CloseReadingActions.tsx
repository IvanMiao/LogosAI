import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  History,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Artifact } from '@/features/artifacts';
import type { AnalysisLanguage } from '@/features/reading';
import { cn } from '@/utils/class-name';
import { formatArtifactTimestamp } from './artifact-display-helpers';

interface CloseReadingActionsProps {
  artifact: Artifact;
  closeReadings: Artifact[];
  analysisLanguage: AnalysisLanguage;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onRunAgain: () => void;
}

const LANGUAGE_LABELS: Record<AnalysisLanguage, string> = {
  zh: '中文',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  ja: '日本語',
};

type CopyStatus = 'idle' | 'copied' | 'failed';

function CopyStatusIcon({ status }: { status: CopyStatus }): ReactElement {
  if (status === 'copied') {
    return <Check className="h-4 w-4" />;
  }
  if (status === 'failed') {
    return <AlertTriangle className="h-4 w-4" />;
  }

  return <Copy className="h-4 w-4" />;
}

function getCopyButtonLabel(status: CopyStatus): string {
  if (status === 'copied') {
    return 'Close Reading copied';
  }
  if (status === 'failed') {
    return 'Copy Close Reading failed';
  }

  return 'Copy Close Reading';
}

export function CloseReadingActions({
  artifact,
  closeReadings,
  analysisLanguage,
  onSelectArtifact,
  onRequestDeleteArtifact,
  onRunAgain,
}: CloseReadingActionsProps): ReactElement {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimerRef = useRef<number | null>(null);
  const copyButtonLabel = getCopyButtonLabel(copyStatus);
  const runAgainLabel = `Run Close Reading again in ${LANGUAGE_LABELS[analysisLanguage]}`;
  const hasRunningOutput = closeReadings.some(({ status }) => status === 'running');

  useEffect(() => () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const resetCopyStatusLater = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), 1800);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    resetCopyStatusLater();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={runAgainLabel}
        title={runAgainLabel}
        disabled={hasRunningOutput}
        onClick={onRunAgain}
      >
        <RefreshCw className="h-4 w-4" />
        <span className="hidden sm:inline">Run again</span>
      </Button>
      {closeReadings.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Open Close Reading outputs"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Outputs</span>
              <span aria-hidden="true">{closeReadings.length}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {closeReadings.map((closeReading) => (
              <DropdownMenuItem
                key={closeReading.id}
                className="gap-2"
                onClick={() => onSelectArtifact(closeReading.id)}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    closeReading.id === artifact.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate">{closeReading.title}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {formatArtifactTimestamp(closeReading)} · {closeReading.status}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-9 w-9 text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
        aria-label="Delete Close Reading"
        title="Delete Close Reading"
        onClick={() => onRequestDeleteArtifact(artifact)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        aria-label={copyButtonLabel}
        title={copyButtonLabel}
        disabled={!artifact.content}
        onClick={() => {
          void handleCopy();
        }}
      >
        <CopyStatusIcon status={copyStatus} />
      </Button>
    </div>
  );
}
