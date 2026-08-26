import { useMemo, useState, type ReactElement } from 'react';
import { BookOpen, FilePlus2, PanelLeftClose, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReadingSessionStats, WorkspaceDocument } from '@/features/reading';
import {
  DocumentListItem,
} from './DocumentLibraryDrawer';
import {
  getSearchContext,
  getSessionCountLabel,
} from './sessions-navigation-helpers';
import {
  WorkspaceDeleteDialog,
} from './WorkspaceDeleteDialog';

interface PinnedSessionsSidebarProps {
  documents: WorkspaceDocument[];
  sessionStatsByDocumentId: Record<string, ReadingSessionStats>;
  activeDocumentId: string | null;
  onCollapse: () => void;
  onOpenDocument: (documentId: string) => void;
  onRenameDocument: (documentId: string, title: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onStartNewDocument: () => void;
}

export function PinnedSessionsSidebar({
  documents,
  sessionStatsByDocumentId,
  activeDocumentId,
  onCollapse,
  onOpenDocument,
  onRenameDocument,
  onDeleteDocument,
  onStartNewDocument,
}: PinnedSessionsSidebarProps): ReactElement {
  const [query, setQuery] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<WorkspaceDocument | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleDocuments = useMemo(() => documents.filter((document) => (
    !normalizedQuery
    || document.title.toLocaleLowerCase().includes(normalizedQuery)
    || document.text.toLocaleLowerCase().includes(normalizedQuery)
  )), [documents, normalizedQuery]);

  return (
    <>
      <nav
        aria-label="Reading sessions"
        className="h-full min-h-0 w-72 shrink-0 overflow-x-hidden overflow-y-auto border-e-2 border-border bg-background p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-mono text-sm font-black uppercase tracking-wide">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Sessions
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label="Collapse sessions sidebar"
            onClick={onCollapse}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <Button type="button" className="mt-3 min-h-11 w-full" onClick={onStartNewDocument}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          New session
        </Button>
        <label className="relative mt-3 block">
          <Search className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search reading sessions</span>
          <input
            type="search"
            value={query}
            placeholder="Search sessions…"
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full border-2 border-border bg-input ps-9 pe-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground" aria-live="polite">
          {getSessionCountLabel(visibleDocuments.length, documents.length)}
        </p>
        <div className="mt-3 space-y-3">
          {visibleDocuments.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
              stats={sessionStatsByDocumentId[document.id] ?? {
                selectionCount: 0,
                entryCount: 0,
              }}
              isActive={document.id === activeDocumentId}
              searchContext={getSearchContext(document, normalizedQuery)}
              onOpen={() => onOpenDocument(document.id)}
              onRename={(title) => onRenameDocument(document.id, title)}
              onDelete={() => setDocumentToDelete(document)}
            />
          ))}
          {visibleDocuments.length === 0 ? (
            <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
              No sessions match this search.
            </p>
          ) : null}
        </div>
      </nav>
      <WorkspaceDeleteDialog
        target={documentToDelete ? {
          kind: 'document',
          id: documentToDelete.id,
          label: documentToDelete.title,
        } : null}
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={() => {
          if (documentToDelete) onDeleteDocument(documentToDelete.id);
          setDocumentToDelete(null);
        }}
      />
    </>
  );
}
