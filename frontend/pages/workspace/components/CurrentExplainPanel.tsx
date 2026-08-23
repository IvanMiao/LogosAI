import type { ReactElement } from 'react';
import {
  ArrowLeft,
  Check,
  History,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { AnchorSkill } from '@/client-api/anchorApi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { ReaderPreferences } from '@/features/reading';
import {
  ArtifactBody,
  ArtifactStatusIcon,
  ArtifactTaskControls,
} from './ArtifactDisplay';
import {
  formatArtifactTimestamp,
  getArtifactLabel,
} from './artifact-display.helpers';

interface CurrentExplainPanelProps {
  activeAnchor: TextAnchor;
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  readingPreferences: ReaderPreferences;
  noteDraftContent: string;
  isNoteEditorOpen: boolean;
  backLabel?: string;
  onBack?: () => void;
  onClose: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteAnchor: (anchor: TextAnchor) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onNoteDraftChange: (content: string) => void;
  onOpenNoteEditor: () => void;
  onRunSkill: (skill: AnchorSkill) => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

function getSourceLabel(anchor: TextAnchor): string {
  if (anchor.scope === 'paragraph') {
    return 'Paragraph';
  }

  if (anchor.scope === 'document') {
    return 'Document';
  }

  return 'Selected text';
}

function OutputHistoryMenu({
  artifacts,
  activeArtifact,
  onSelectArtifact,
}: {
  artifacts: Artifact[];
  activeArtifact: Artifact;
  onSelectArtifact: (artifactId: string) => void;
}): ReactElement | null {
  if (artifacts.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" aria-label="Open output versions">
          <History className="h-4 w-4" aria-hidden="true" />
          {artifacts.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {artifacts.map((artifact) => (
          <DropdownMenuItem
            key={artifact.id}
            className="gap-2"
            onClick={() => onSelectArtifact(artifact.id)}
          >
            <Check
              className={artifact.id === activeArtifact.id ? 'opacity-100' : 'opacity-0'}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate">{getArtifactLabel(artifact)}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {formatArtifactTimestamp(artifact)} · {artifact.status}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SourceActions({
  activeAnchor,
  onOpenNoteEditor,
  onRequestDeleteAnchor,
  onRunSkill,
}: Pick<
  CurrentExplainPanelProps,
  'activeAnchor' | 'onOpenNoteEditor' | 'onRequestDeleteAnchor' | 'onRunSkill'
>): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Source actions">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onRunSkill('explain')}>Explain again</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRunSkill('translate')}>Translate</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRunSkill('vocab')}>Vocabulary</DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenNoteEditor}>Write note</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-error-foreground focus:bg-destructive focus:text-destructive-foreground"
          onClick={() => onRequestDeleteAnchor(activeAnchor)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete saved source
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CurrentExplainPanel({
  activeAnchor,
  artifacts,
  activeArtifact,
  readingPreferences,
  noteDraftContent,
  isNoteEditorOpen,
  backLabel,
  onBack,
  onClose,
  onSelectArtifact,
  onRequestDeleteAnchor,
  onRequestDeleteArtifact,
  onNoteDraftChange,
  onOpenNoteEditor,
  onRunSkill,
  onStopArtifact,
  onRetryArtifact,
}: CurrentExplainPanelProps): ReactElement {
  return (
    <aside
      aria-label="Current explanation"
      className="h-full min-h-[32rem] overflow-y-auto border-border bg-[#fbfbf8]"
    >
      <header className="sticky top-0 z-10 border-b-2 border-border bg-card px-4 py-3 font-mono shadow-[0_4px_0px_0px_var(--border)]">
        {onBack ? (
          <Button type="button" size="sm" variant="outline" className="mb-3" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel ?? 'Back'}
          </Button>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
              {getSourceLabel(activeAnchor)}
            </p>
            <blockquote className="mt-2 line-clamp-3 border-s-4 border-secondary ps-3 font-sans text-sm leading-6">
              {activeAnchor.quote}
            </blockquote>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SourceActions
              activeAnchor={activeAnchor}
              onOpenNoteEditor={onOpenNoteEditor}
              onRequestDeleteAnchor={onRequestDeleteAnchor}
              onRunSkill={onRunSkill}
            />
            {!onBack ? (
              <Button type="button" size="icon" variant="ghost" aria-label="Close explanation" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[68ch] px-5 py-6 sm:px-7">
        {isNoteEditorOpen ? (
          <label className="mb-6 block border-2 border-l-[8px] border-border border-l-accent bg-card p-3 text-xs font-black shadow-[2px_2px_0px_0px_var(--border)]">
            Note
            <textarea
              autoFocus
              value={noteDraftContent}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder="Write a note attached to this source…"
              rows={4}
              className="mt-2 w-full resize-y border-2 border-border bg-background p-2 font-sans text-base font-normal leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
        ) : null}

        {activeArtifact ? (
          <section aria-label="Active output">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3 font-mono">
              <div className="flex min-w-0 items-center gap-2">
                <ArtifactStatusIcon artifact={activeArtifact} />
                <h2 className="truncate text-sm font-black">{getArtifactLabel(activeArtifact)}</h2>
              </div>
              <div className="flex items-center gap-1">
                <OutputHistoryMenu
                  artifacts={artifacts}
                  activeArtifact={activeArtifact}
                  onSelectArtifact={onSelectArtifact}
                />
                <ArtifactTaskControls
                  artifact={activeArtifact}
                  onStopArtifact={onStopArtifact}
                  onRetryArtifact={onRetryArtifact}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
                  aria-label={`Delete ${getArtifactLabel(activeArtifact)} output`}
                  onClick={() => onRequestDeleteArtifact(activeArtifact)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <ArtifactBody
              artifact={activeArtifact}
              variant="reading"
              readingPreferences={readingPreferences}
            />
          </section>
        ) : (
          <div className="border-2 border-dashed border-border bg-card p-5">
            <h2 className="text-sm font-black">Choose how to explore this text</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Explain the meaning, translate it, collect vocabulary, or attach a note.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>Explain</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('translate')}>Translate</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onRunSkill('vocab')}>Vocabulary</Button>
              <Button type="button" size="sm" variant="secondary" onClick={onOpenNoteEditor}>Note</Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
