import { ExplainSourceQuote } from './ExplainSourceQuote';
import { useReadingScroll } from '../useReadingScroll';
import type { ReactElement } from 'react';
import {
  ArrowLeft,
  Check,
  History,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { AnchorSkill } from '@/features/anchors';
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
} from './artifact-display-helpers';

interface CurrentExplainPanelProps {
  activeAnchor: TextAnchor;
  canShowSource: boolean;
  onShowSource: () => void;
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

export function CurrentExplainPanel(props: CurrentExplainPanelProps): ReactElement {
  const {
    activeAnchor, canShowSource, onShowSource, activeArtifact,
    noteDraftContent, isNoteEditorOpen,
    onNoteDraftChange, onOpenNoteEditor, onRunSkill,
  } = props;
  const paneRef = useReadingScroll(`artifact:${activeArtifact?.id ?? activeAnchor.id}`);
  return (
    <aside
      ref={paneRef}
      aria-label="Current explanation"
      className="h-full min-h-0 overflow-y-auto border-border bg-[#fbfbf8]"
    >
      <ExplainHeader {...props} />

      <div className="mx-auto max-w-[68ch] px-5 py-5 sm:px-7 sm:py-6">
        <ExplainSourceQuote key={activeAnchor.id} anchor={activeAnchor} canShowSource={canShowSource} onShowSource={onShowSource} />
        {isNoteEditorOpen ? (
          <label className="my-6 block border-2 border-l-[8px] border-border border-l-accent bg-card p-3 text-xs font-black shadow-[2px_2px_0px_0px_var(--border)]">
            Note
            <textarea
              autoFocus
              data-reading-focus="note-editor"
              value={noteDraftContent}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder="Write a note attached to this source…"
              rows={4}
              className="mt-2 w-full resize-y border-2 border-border bg-background p-2 font-sans text-base font-normal leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
        ) : null}

        {activeArtifact ? (
          <ExplainOutput {...props} activeArtifact={activeArtifact} />
        ) : (
          <div className="mt-6 border-2 border-dashed border-border bg-card p-5">
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

function ExplainHeader({
  activeAnchor, activeArtifact, backLabel, onBack, onClose,
  onOpenNoteEditor, onRequestDeleteAnchor, onRunSkill, onStopArtifact, onRetryArtifact,
}: CurrentExplainPanelProps): ReactElement {
  return (
    <header data-reading-sticky className="sticky top-0 z-10 border-b border-border/30 bg-card px-3 py-2 font-mono sm:px-4">
      <div className="flex min-h-10 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={backLabel ?? 'Back'} title={backLabel ?? 'Back'} onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          <h2 className="truncate text-xs font-black uppercase tracking-[0.1em] sm:text-sm">Explain</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SourceActions
            activeAnchor={activeAnchor} onOpenNoteEditor={onOpenNoteEditor}
            onRequestDeleteAnchor={onRequestDeleteAnchor} onRunSkill={onRunSkill}
          />
          {!onBack ? (
            <Button type="button" size="icon" variant="ghost" aria-label="Close explanation" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
      {activeArtifact ? (
        <ArtifactTaskControls variant="reading" artifact={activeArtifact} onStopArtifact={onStopArtifact} onRetryArtifact={onRetryArtifact} />
      ) : null}
    </header>
  );
}

function ExplainOutput({
  activeArtifact, artifacts, onSelectArtifact, onRequestDeleteArtifact, readingPreferences,
}: Pick<CurrentExplainPanelProps, 'artifacts' | 'onSelectArtifact' | 'onRequestDeleteArtifact' | 'readingPreferences'> & {
  activeArtifact: Artifact;
}): ReactElement {
  return (
    <section data-reading-content aria-label="Active output" className="mt-5 border-t border-border/30 pt-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 font-mono">
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
        showRecoveryHint
        readingPreferences={readingPreferences}
      />
    </section>
  );
}
