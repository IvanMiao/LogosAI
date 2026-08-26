import { useMemo, useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import { BookOpen, Check, FilePlus2, Pin, Pencil, Search, Trash2 } from 'lucide-react';
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
import {
  getSearchContext,
  getSessionCountLabel,
} from './sessions-navigation-helpers';
import { WorkspaceDeleteDialog } from './WorkspaceDeleteDialog';

interface DocumentLibraryDrawerProps {
  open: boolean;
  documents: WorkspaceDocument[];
  sessionStatsByDocumentId: Record<string, ReadingSessionStats>;
  activeDocumentId: string | null;
  history: HistoryItem[];
  canPin?: boolean;
  onOpenChange: (open: boolean) => void;
  onPin?: () => void;
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
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function DocumentListItem({
  document,
  stats,
  isActive,
  searchContext,
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
    <article className="min-w-0 overflow-hidden border-2 border-border bg-card p-3">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 overflow-hidden text-start"
          onClick={onOpen}
        >
          <span className="flex min-w-0 w-full items-center gap-2">
            {isActive ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            <span className="min-w-0 flex-1 truncate text-sm font-black">{document.title}</span>
          </span>
          {searchContext ? (
            <span className="mt-2 block line-clamp-2 break-words font-sans text-xs leading-5 text-muted-foreground">
              {searchContext}
            </span>
          ) : null}
          <span className="mt-2 block break-words text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {formatDocumentMeta(document)} · Last opened {formatDateTime(document.lastOpenedAt ?? document.updatedAt)}
          </span>
          <span className="mt-1 block break-words text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
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

export function DocumentLibraryDrawer({
  open,
  documents,
  sessionStatsByDocumentId,
  activeDocumentId,
  history,
  canPin = false,
  onOpenChange,
  onPin,
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
        <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh min-w-0 max-w-md grid-cols-[minmax(0,1fr)] translate-x-0 translate-y-0 overflow-x-hidden overflow-y-auto p-5">
          <DialogHeader className="min-w-0 pe-7">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-balance">
                <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
                Reading sessions
              </DialogTitle>
              {canPin && onPin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={onPin}
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                  Pin
                </Button>
              ) : null}
            </div>
            <DialogDescription className="break-words text-pretty">
              Find, rename, or switch sessions. Full text opens in the reading workspace.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="mt-2 min-h-11 w-full" onClick={startNewDocument}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New session
          </Button>
          <label className="relative mt-2 block">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Search reading sessions</span>
            <input
              type="search"
              value={query}
              placeholder="Search title or full text…"
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full min-w-0 border-2 border-border bg-input ps-9 pe-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground" aria-live="polite">
            {getSessionCountLabel(visibleDocuments.length, documents.length)}
          </p>
          <div className="mt-4 min-w-0 space-y-3">
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
