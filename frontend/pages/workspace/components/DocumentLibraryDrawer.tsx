import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import { BookOpen, Check, FilePlus2, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/utils/formatters';
import type { HistoryItem } from '@/types';
import type { ReadingSessionStats, WorkspaceDocument } from '@/features/reading';
import { formatDocumentMeta } from '@/features/reading/reading-core';
import { WorkspaceDeleteDialog } from './WorkspaceDeleteDialog';

interface DocumentLibraryDrawerProps {
  open: boolean;
  documents: WorkspaceDocument[];
  sessionStatsByDocumentId: Record<string, ReadingSessionStats>;
  activeDocumentId: string | null;
  history: HistoryItem[];
  onOpenChange: (open: boolean) => void;
  onOpenDocument: (documentId: string) => void;
  onRenameDocument: (documentId: string, title: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onStartNewDocument: () => void;
  onOpenLegacyDocument: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: number) => void;
}

interface DocumentListItemProps {
  document: WorkspaceDocument;
  stats: ReadingSessionStats;
  isActive: boolean;
  searchContext: string;
  matchCount: number;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function DocumentListItem({
  document,
  stats,
  isActive,
  searchContext,
  matchCount,
  onOpen,
  onRename,
  onDelete,
}: DocumentListItemProps): ReactElement {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(document.title);

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    onRename(draftTitle);
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setDraftTitle(document.title);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') cancelRename();
  };

  return (
    <article className="border-2 border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <span className="flex items-center gap-2">
            {isActive ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            <span className="truncate text-sm font-black">{document.title}</span>
          </span>
          {searchContext ? (
            <span className="mt-2 block line-clamp-2 font-sans text-xs leading-5 text-muted-foreground">
              {searchContext}
            </span>
          ) : null}
          {matchCount > 1 ? (
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {matchCount} matches in this text
            </span>
          ) : null}
          <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {formatDocumentMeta(document)} · Last opened {formatDateTime(document.lastOpenedAt ?? document.updatedAt)}
          </span>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {stats.selectionCount} {stats.selectionCount === 1 ? 'selection' : 'selections'}
            {' · '}
            {stats.entryCount} {stats.entryCount === 1 ? 'reading entry' : 'reading entries'}
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={`Rename ${document.title}`}
            onClick={() => setIsRenaming(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={`Delete ${document.title}`}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {isRenaming ? (
        <form className="mt-3 flex gap-2 border-t-2 border-border pt-3" onSubmit={submitRename}>
          <input
            autoFocus
            aria-label={`New title for ${document.title}`}
            value={draftTitle}
            maxLength={160}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleRenameKeyDown}
            className="h-11 min-w-0 flex-1 border-2 border-border bg-input px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
          <Button type="submit" size="sm" className="min-h-11" disabled={!draftTitle.trim()}>
            Save
          </Button>
        </form>
      ) : null}
    </article>
  );
}

function LegacyHistory({
  history,
  onOpen,
  onDelete,
}: {
  history: HistoryItem[];
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
}): ReactElement | null {
  if (history.length === 0) return null;

  return (
    <details className="border-t-2 border-border pt-4">
      <summary className="cursor-pointer text-sm font-black">
        Legacy analyses · {history.length}
      </summary>
      <div className="mt-3 space-y-3">
        {history.map((item) => (
          <article key={item.id} className="border-2 border-border bg-card p-3">
            <p className="line-clamp-2 font-sans text-xs leading-5">{item.prompt}</p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={() => onOpen(item)}>Import</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

function getSessionCountLabel(visibleCount: number, totalCount: number): string {
  if (visibleCount === totalCount) {
    return `${totalCount} ${totalCount === 1 ? 'session' : 'sessions'}`;
  }

  return `${visibleCount} of ${totalCount} sessions`;
}

function getTextMatchExcerpt(text: string, query: string): string {
  const matchIndex = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (matchIndex < 0) {
    return '';
  }

  const excerptStart = Math.max(0, matchIndex - 32);
  const excerptEnd = Math.min(text.length, matchIndex + query.length + 56);
  const excerpt = text.slice(excerptStart, excerptEnd).replace(/\s+/g, ' ').trim();
  const prefix = excerptStart > 0 ? '…' : '';
  const suffix = excerptEnd < text.length ? '…' : '';
  return `${prefix}${excerpt}${suffix}`;
}

const OPENING_EXCERPT_MAX_LENGTH = 140;

/**
 * An auto-generated title is the text's own first line, so it identifies a
 * session poorly and is then truncated to roughly a third of its length. Show
 * the opening of the text as well, otherwise the only way to tell two untitled
 * sessions apart is to open each one and read it.
 */
function getOpeningExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > OPENING_EXCERPT_MAX_LENGTH
    ? `${normalized.slice(0, OPENING_EXCERPT_MAX_LENGTH).trimEnd()}…`
    : normalized;
}

function getSearchContext(document: WorkspaceDocument, query: string): string {
  if (!query) {
    return getOpeningExcerpt(document.text);
  }

  if (document.title.toLocaleLowerCase().includes(query)) {
    return 'Title match';
  }

  const excerpt = getTextMatchExcerpt(document.text, query);
  return excerpt ? `Text match: “${excerpt}”` : '';
}

function countMatches(text: string, query: string): number {
  if (!query) {
    return 0;
  }

  return text.toLocaleLowerCase().split(query.toLocaleLowerCase()).length - 1;
}

export function DocumentLibraryDrawer({
  open,
  documents,
  sessionStatsByDocumentId,
  activeDocumentId,
  history,
  onOpenChange,
  onOpenDocument,
  onRenameDocument,
  onDeleteDocument,
  onStartNewDocument,
  onOpenLegacyDocument,
  onDeleteHistoryItem,
}: DocumentLibraryDrawerProps): ReactElement {
  const [query, setQuery] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<WorkspaceDocument | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleDocuments = useMemo(() => documents.filter((document) => (
    !normalizedQuery
    || document.title.toLocaleLowerCase().includes(normalizedQuery)
    || document.text.toLocaleLowerCase().includes(normalizedQuery)
  )), [documents, normalizedQuery]);

  const openDocument = (documentId: string) => {
    onOpenDocument(documentId);
    onOpenChange(false);
  };

  const startNewDocument = () => {
    onStartNewDocument();
    onOpenChange(false);
  };

  const requestDelete = (document: WorkspaceDocument) => {
    setDocumentToDelete(document);
    onOpenChange(false);
  };

  const cancelDelete = () => {
    setDocumentToDelete(null);
    onOpenChange(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) onDeleteDocument(documentToDelete.id);
    setDocumentToDelete(null);
  };

  const importLegacyDocument = (item: HistoryItem) => {
    onOpenLegacyDocument(item);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh max-w-md translate-x-0 translate-y-0 overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Reading sessions
            </DialogTitle>
            <DialogDescription>
              Find, rename, or switch sessions. Full text opens in the reading workspace.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="mt-2 min-h-11 w-full" onClick={startNewDocument}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New session
          </Button>
          <label className="relative mt-2 block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Search reading sessions</span>
            <input
              type="search"
              value={query}
              placeholder="Search title or full text…"
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full border-2 border-border bg-input pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground" aria-live="polite">
            {getSessionCountLabel(visibleDocuments.length, documents.length)}
          </p>
          <div className="mt-4 space-y-3">
            {visibleDocuments.length > 0 ? visibleDocuments.map((document) => (
              <DocumentListItem
                key={document.id}
                document={document}
                stats={sessionStatsByDocumentId[document.id] ?? {
                  selectionCount: 0,
                  entryCount: 0,
                }}
                isActive={document.id === activeDocumentId}
                searchContext={getSearchContext(document, normalizedQuery)}
                matchCount={countMatches(document.text, normalizedQuery)}
                onOpen={() => openDocument(document.id)}
                onRename={(title) => onRenameDocument(document.id, title)}
                onDelete={() => requestDelete(document)}
              />
            )) : (
              <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                {documents.length === 0
                  ? 'No reading sessions yet. Import a text to begin.'
                  : 'No sessions match this search.'}
              </p>
            )}
          </div>
          <div className="mt-6">
            <LegacyHistory
              history={history}
              onOpen={importLegacyDocument}
              onDelete={onDeleteHistoryItem}
            />
          </div>
        </DialogContent>
      </Dialog>
      <WorkspaceDeleteDialog
        target={documentToDelete ? {
          kind: 'document',
          id: documentToDelete.id,
          label: documentToDelete.title,
        } : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
