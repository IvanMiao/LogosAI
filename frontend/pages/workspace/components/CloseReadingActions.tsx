import type { ReactElement } from 'react';
import { Check, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Artifact } from '@/features/artifacts';
import { cn } from '@/utils/className';
import { ArtifactCopyButton } from './ArtifactDisplay';
import {
  formatArtifactTimestamp,
  getArtifactPreview,
  getArtifactStatusLabel,
} from './artifact-display.helpers';

interface CloseReadingActionsProps {
  artifact: Artifact;
  closeReadings: Artifact[];
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
}

export function CloseReadingActions({
  artifact,
  closeReadings,
  onSelectArtifact,
  onRequestDeleteArtifact,
}: CloseReadingActionsProps): ReactElement {
  return (
    <div className="flex items-center gap-1">
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
          <DropdownMenuContent align="end" className="w-80">
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
                    {formatArtifactTimestamp(closeReading)}
                    {' · '}
                    {getArtifactStatusLabel(closeReading.status)}
                  </span>
                  <span className="mt-1 block line-clamp-2 font-sans text-xs font-normal leading-5 text-muted-foreground">
                    {getArtifactPreview(closeReading)}
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
      <ArtifactCopyButton artifact={artifact} contentLabel="Close Reading" />
    </div>
  );
}
