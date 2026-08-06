import type { ReactElement } from 'react';
import {
  Brain,
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
import { formatDocumentMeta } from '../workspace.helpers';
import type { WorkspaceDocument } from '../workspace.types';
import {
  ArtifactBody,
  ArtifactStatusIcon,
  ArtifactTaskControls,
} from './ArtifactDisplay';
import {
  formatArtifactTimestamp,
  getArtifactLabel,
} from './artifact-display.helpers';

interface ContextPanelProps {
  activeDocument: WorkspaceDocument;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
  artifactCountByAnchorId: Record<string, number>;
  noteDraftContent: string;
  isNoteEditorOpen: boolean;
  onClearActiveAnchor: () => void;
  onSelectAnchor: (anchorId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteAnchor: (anchor: TextAnchor) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onNoteDraftChange: (content: string) => void;
  onOpenNoteEditor: () => void;
  onRunSkill: (skill: AnchorSkill) => void;
  onRunCloseReadDocument: () => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

interface SessionDashboardProps {
  activeDocument: WorkspaceDocument;
  anchors: TextAnchor[];
  artifactCountByAnchorId: Record<string, number>;
  onSelectAnchor: (anchorId: string) => void;
  onRequestDeleteAnchor: (anchor: TextAnchor) => void;
  onRunCloseReadDocument: () => void;
}

interface ActiveAnchorHeaderProps {
  activeAnchor: TextAnchor;
  onClearActiveAnchor: () => void;
  onRequestDeleteAnchor: (anchor: TextAnchor) => void;
  onOpenNoteEditor: () => void;
  onRunSkill: (skill: AnchorSkill) => void;
}

interface ActiveArtifactProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
  onSelectArtifact: (artifactId: string) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
  onStopArtifact: (artifact: Artifact) => void;
  onRetryArtifact: (artifact: Artifact) => void;
}

function SessionDashboard({
  activeDocument,
  anchors,
  artifactCountByAnchorId,
  onSelectAnchor,
  onRequestDeleteAnchor,
  onRunCloseReadDocument,
}: SessionDashboardProps): ReactElement {
  const savedSelections = anchors.filter((anchor) => anchor.scope === 'selection');
  const closeReadSources = anchors.filter((anchor) => anchor.scope !== 'selection');

  return (
    <div className="flex h-full flex-col">
      <div className="border-2 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Current document</p>
        <h2 className="mt-2 text-lg font-black">{activeDocument.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{formatDocumentMeta(activeDocument)}</p>
      </div>

      <div className="mt-6 border-2 border-border bg-card p-4 shadow-[2px_2px_0px_0px_var(--border)]">
        <p className="text-sm font-bold">{anchors.length} saved {anchors.length === 1 ? 'mark' : 'marks'}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Select a passage to explain, translate, save vocabulary, or write a note.
        </p>
      </div>

      <div className="mt-5 space-y-5 overflow-y-auto pb-5">
        <SavedAnchorList
          title="Saved selections"
          anchors={savedSelections}
          artifactCountByAnchorId={artifactCountByAnchorId}
          onSelectAnchor={onSelectAnchor}
          onRequestDeleteAnchor={onRequestDeleteAnchor}
        />
        <SavedAnchorList
          title="Close Read sources"
          anchors={closeReadSources}
          artifactCountByAnchorId={artifactCountByAnchorId}
          onSelectAnchor={onSelectAnchor}
          onRequestDeleteAnchor={onRequestDeleteAnchor}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-auto self-start hover:bg-primary"
        onClick={onRunCloseReadDocument}
      >
        <Brain className="h-4 w-4" />
        Close Read document
      </Button>
    </div>
  );
}

function SavedAnchorList({
  title,
  anchors,
  artifactCountByAnchorId,
  onSelectAnchor,
  onRequestDeleteAnchor,
}: {
  title: string;
  anchors: TextAnchor[];
  artifactCountByAnchorId: Record<string, number>;
  onSelectAnchor: (anchorId: string) => void;
  onRequestDeleteAnchor: (anchor: TextAnchor) => void;
}): ReactElement | null {
  if (anchors.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        {title} · {anchors.length}
      </h3>
      <div className="mt-2 divide-y-2 divide-border border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)]">
        {[...anchors]
          .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
          .map((anchor) => (
            <div key={anchor.id} className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                aria-label={anchor.quote}
                onClick={() => onSelectAnchor(anchor.id)}
                className="min-w-0 flex-1 bg-transparent py-1 text-left text-sm leading-5 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="line-clamp-2">{anchor.quote}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase text-muted-foreground">
                  {formatOutputCount(artifactCountByAnchorId[anchor.id] ?? 0)}
                </span>
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
                aria-label={`Delete saved ${anchor.scope}: ${anchor.quote}`}
                onClick={() => onRequestDeleteAnchor(anchor)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
      </div>
    </section>
  );
}

function formatOutputCount(count: number): string {
  return `${count} ${count === 1 ? 'output' : 'outputs'}`;
}

function ActiveAnchorHeader({
  activeAnchor,
  onClearActiveAnchor,
  onRequestDeleteAnchor,
  onOpenNoteEditor,
  onRunSkill,
}: ActiveAnchorHeaderProps): ReactElement {
  return (
    <header className="border-2 border-l-[8px] border-border border-l-secondary bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {activeAnchor.scope}
          </p>
          <p className="mt-2 line-clamp-3 font-sans text-sm leading-6">{activeAnchor.quote}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Selection actions menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onRunSkill('explain')}>Explain</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRunSkill('translate')}>Translate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRunSkill('vocab')}>Vocab</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenNoteEditor}>Write note</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label={`Delete saved ${activeAnchor.scope}`}
            onClick={() => onRequestDeleteAnchor(activeAnchor)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close active selection"
            onClick={onClearActiveAnchor}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function ActiveArtifactView({
  artifacts,
  artifact,
  onSelectArtifact,
  onRequestDeleteArtifact,
  onStopArtifact,
  onRetryArtifact,
}: ActiveArtifactProps): ReactElement {
  if (!artifact) {
    return (
      <p className="mt-5 border-2 border-dashed border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
        Choose an action from the selected passage to create an artifact.
      </p>
    );
  }

  return (
    <section aria-label="Active artifact" className="mt-5 border-2 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ArtifactStatusIcon artifact={artifact} />
          <h3 className="truncate text-sm font-black">{getArtifactLabel(artifact)}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ArtifactHistoryMenu
            artifacts={artifacts}
            activeArtifact={artifact}
            onSelectArtifact={onSelectArtifact}
          />
          <ArtifactTaskControls
            artifact={artifact}
            onStopArtifact={onStopArtifact}
            onRetryArtifact={onRetryArtifact}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label={`Delete ${getArtifactLabel(artifact)} output`}
            onClick={() => onRequestDeleteArtifact(artifact)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <ArtifactBody artifact={artifact} />
      </div>
    </section>
  );
}

function ArtifactHistoryMenu({
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
        <Button type="button" size="sm" variant="outline" aria-label="Open output history">
          <History className="h-4 w-4" />
          {artifacts.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {artifacts.map((historyArtifact) => (
          <DropdownMenuItem
            key={historyArtifact.id}
            className="gap-2"
            onClick={() => onSelectArtifact(historyArtifact.id)}
          >
            <Check className={historyArtifact.id === activeArtifact.id ? 'opacity-100' : 'opacity-0'} />
            <span className="min-w-0">
              <span className="block truncate">{getArtifactLabel(historyArtifact)}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {formatArtifactTimestamp(historyArtifact)} · {historyArtifact.status}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {historyArtifact.content || historyArtifact.status}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContextPanel({
  activeDocument,
  activeAnchor,
  anchors,
  activeArtifacts,
  activeArtifact,
  artifactCountByAnchorId,
  noteDraftContent,
  isNoteEditorOpen,
  onClearActiveAnchor,
  onSelectAnchor,
  onSelectArtifact,
  onRequestDeleteAnchor,
  onRequestDeleteArtifact,
  onNoteDraftChange,
  onOpenNoteEditor,
  onRunSkill,
  onRunCloseReadDocument,
  onStopArtifact,
  onRetryArtifact,
}: ContextPanelProps): ReactElement {
  if (!activeAnchor) {
    return (
      <aside aria-label="Context panel" className="h-full bg-background p-4 font-mono">
        <div className="mb-5 flex items-center gap-2 border-2 border-border bg-card px-3 py-2 shadow-[4px_4px_0px_0px_var(--border)]">
          <span className="h-3 w-3 border border-border bg-secondary" aria-hidden="true" />
          <p className="text-xs font-black uppercase tracking-[0.18em]">Context</p>
        </div>
        <div className="min-h-[calc(100vh-13rem)]">
          <SessionDashboard
            activeDocument={activeDocument}
            anchors={anchors}
            artifactCountByAnchorId={artifactCountByAnchorId}
            onSelectAnchor={onSelectAnchor}
            onRequestDeleteAnchor={onRequestDeleteAnchor}
            onRunCloseReadDocument={onRunCloseReadDocument}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Context panel" className="h-full overflow-y-auto bg-background p-4 font-mono">
      <div className="mb-5 flex items-center gap-2 border-2 border-border bg-card px-3 py-2 shadow-[4px_4px_0px_0px_var(--border)]">
        <span className="h-3 w-3 border border-border bg-secondary" aria-hidden="true" />
        <p className="text-xs font-black uppercase tracking-[0.18em]">Context</p>
      </div>
      <ActiveAnchorHeader
        activeAnchor={activeAnchor}
        onClearActiveAnchor={onClearActiveAnchor}
        onRequestDeleteAnchor={onRequestDeleteAnchor}
        onOpenNoteEditor={onOpenNoteEditor}
        onRunSkill={onRunSkill}
      />
      {isNoteEditorOpen ? (
        <label className="mt-5 block border-2 border-l-[8px] border-border border-l-accent bg-card p-3 text-xs font-black shadow-[2px_2px_0px_0px_var(--border)]">
          Note
          <textarea
            autoFocus
            value={noteDraftContent}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            placeholder="Write a note attached to this selection..."
            rows={4}
            className="mt-2 w-full resize-y border-2 border-border bg-background p-2 font-sans text-base font-normal leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </label>
      ) : null}
      <ActiveArtifactView
        artifacts={activeArtifacts}
        artifact={activeArtifact}
        onSelectArtifact={onSelectArtifact}
        onRequestDeleteArtifact={onRequestDeleteArtifact}
        onStopArtifact={onStopArtifact}
        onRetryArtifact={onRetryArtifact}
      />
    </aside>
  );
}
