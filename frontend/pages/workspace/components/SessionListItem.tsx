import { useRef, useState, type ReactElement } from 'react';
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReadingSessionStats, WorkspaceDocument } from '@/features/reading';
import { formatDocumentMeta } from '@/features/reading/reading-core';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { cn } from '@/utils/class-name';

interface SessionListItemProps {
  document: WorkspaceDocument;
  stats: ReadingSessionStats;
  isActive: boolean;
  searchContext: string;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function SessionDetails({ document, stats }: Pick<SessionListItemProps, 'document' | 'stats'>): ReactElement {
  return (
    <DropdownMenuLabel className="max-w-64 space-y-1 break-words font-normal">
      <p className="font-semibold text-foreground">{document.title}</p>
      <p>{formatDocumentMeta(document)}</p>
      <p>Last opened {formatDateTime(document.lastOpenedAt ?? document.updatedAt)}</p>
      <p>
        {stats.selectionCount} {stats.selectionCount === 1 ? 'selection' : 'selections'}
        {' · '}
        {stats.entryCount} {stats.entryCount === 1 ? 'reading entry' : 'reading entries'}
      </p>
    </DropdownMenuLabel>
  );
}

export function SessionListItem({
  document, stats, isActive, searchContext, onOpen, onRename, onDelete,
}: SessionListItemProps): ReactElement {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(document.title);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const openedAt = document.lastOpenedAt ?? document.updatedAt;
  const finishRename = () => {
    setIsRenaming(false);
    menuTriggerRef.current?.focus();
  };

  return (
    <article className={cn(
      'min-w-0 overflow-hidden border-s-2',
      isActive ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted/50',
    )}>
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          aria-current={isActive ? 'page' : undefined}
          title={document.title}
          className="min-w-0 flex-1 px-2 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={onOpen}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{document.title}</span>
            {isActive ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground" title={formatDateTime(openedAt)}>
            Opened {formatDate(openedAt)}
          </span>
          {searchContext ? (
            <span className="mt-1 block line-clamp-2 break-words font-sans text-xs leading-5 text-muted-foreground">
              {searchContext}
            </span>
          ) : null}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button ref={menuTriggerRef} type="button" variant="ghost" size="icon"
              className="h-11 w-11 shrink-0" aria-label={`More options for ${document.title}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[110]"
            onCloseAutoFocus={(event) => {
              if (!renameInputRef.current) return;
              event.preventDefault();
              renameInputRef.current.focus();
            }}>
            <SessionDetails document={document} stats={stats} />
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { setDraftTitle(document.title); setIsRenaming(true); }}>
              <Pencil className="me-2 h-4 w-4" aria-hidden="true" />Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete}>
              <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isRenaming ? (
        <form className="flex flex-wrap gap-2 p-2" onSubmit={(event) => {
          event.preventDefault();
          if (!draftTitle.trim()) return;
          onRename(draftTitle.trim());
          finishRename();
        }}>
          <input ref={renameInputRef} autoFocus aria-label={`New title for ${document.title}`}
            value={draftTitle} maxLength={160}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.stopPropagation();
              finishRename();
            }}
            className="h-11 w-full min-w-0 border-2 border-border bg-input px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm" />
          <Button type="submit" size="sm" className="min-h-11" disabled={!draftTitle.trim()}>Save</Button>
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={finishRename}>Cancel</Button>
        </form>
      ) : null}
    </article>
  );
}
