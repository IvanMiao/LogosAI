import { useMemo, useState, type ReactElement } from 'react';
import { BookOpen, FilePlus2, Pin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HistoryItem } from '@/types';
import type { ReadingSessionStats, WorkspaceDocument } from '@/features/reading';
import { SessionListItem } from './SessionListItem';
import {
  getSearchContext,
  getSessionCountLabel,
} from './sessions-navigation-helpers';
import { WorkspaceDeleteDialog } from './WorkspaceDeleteDialog';

interface DocumentLibraryDrawerProps {
  open: boolean;
  documents: WorkspaceDocument[];
  query: string;
  onQueryChange: (query: string) => void;
  sessionStatsByDocumentId: Record<string, ReadingSessionStats>;
  activeDocumentId: string | null;
  history: HistoryItem[];
  canPin?: boolean;
  onOpenChange: (open: boolean) => void;
  onPin?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onOpenDocument: (documentId: string) => void;
  onRenameDocument: (documentId: string, title: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onStartNewDocument: () => void;
  onOpenLegacyDocument: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: number) => void;
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
  query,
  onQueryChange,
  sessionStatsByDocumentId,
  activeDocumentId,
  history,
  canPin = false,
  onOpenChange,
  onPin,
  onCloseAutoFocus,
  onOpenDocument,
  onRenameDocument,
  onDeleteDocument,
  onStartNewDocument,
  onOpenLegacyDocument,
  onDeleteHistoryItem,
}: DocumentLibraryDrawerProps): ReactElement {
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
        <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="left-0 right-auto top-0 flex h-dvh max-h-dvh w-80 max-w-full min-w-0 flex-col gap-0 translate-x-0 translate-y-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4 data-[state=open]:animate-none data-[state=closed]:animate-none [&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center">
          <DialogHeader className="min-w-0 pe-11 text-start">
            <div className="flex min-h-11 min-w-0 items-center justify-between gap-2">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-sm font-black uppercase tracking-wide">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span aria-hidden="true">Sessions</span>
                <span className="sr-only">Reading sessions</span>
              </DialogTitle>
              {canPin && onPin ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0"
                  aria-label="Pin sessions sidebar"
                  title="Pin sessions sidebar"
                  onClick={onPin}
                >
                  <Pin className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <DialogDescription className="sr-only">
              Find, rename, or switch sessions. Full text opens in the reading workspace.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="mt-3 min-h-11 w-full shrink-0" onClick={startNewDocument}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New session
          </Button>
          <label className="relative mt-3 block shrink-0">
            <Search className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Search reading sessions</span>
            <input
              type="search"
              value={query}
              placeholder="Search sessions…"
              onChange={(event) => onQueryChange(event.target.value)}
              className="h-11 w-full min-w-0 border-2 border-border bg-input ps-9 pe-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
          <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground" aria-live="polite">
            {getSessionCountLabel(visibleDocuments.length, documents.length)}
          </p>
          <div className="mt-3 min-w-0 space-y-1">
            {visibleDocuments.length > 0 ? visibleDocuments.map((document) => (
              <SessionListItem
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
