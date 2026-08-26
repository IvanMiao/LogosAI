import { useMemo, useState, type ReactElement } from 'react';
import { ArrowUpRight, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Artifact } from '@/features/artifacts';
import type { ReaderPreferences } from '@/features/reading';
import type { WorkspaceSessionArtifact } from '../workspace-types';
import { ArtifactBody, ArtifactStatusIcon } from './ArtifactDisplay';
import {
  formatArtifactTimestamp,
  getArtifactLabel,
} from './artifact-display-helpers';

type ArtifactFilter = 'all' | Artifact['type'];
export type HistorySort = 'recent' | 'source';

interface HistoryWorkspaceProps {
  entries: WorkspaceSessionArtifact[];
  readingPreferences: ReaderPreferences;
  onOpenEntry: (entry: WorkspaceSessionArtifact) => void;
  onRequestDeleteArtifact: (artifact: Artifact) => void;
}

function getFilteredEntries(
  entries: WorkspaceSessionArtifact[],
  query: string,
  typeFilter: ArtifactFilter,
  sort: HistorySort,
): WorkspaceSessionArtifact[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEntries = entries.filter(({ artifact, anchor }) => (
    (typeFilter === 'all' || artifact.type === typeFilter)
    && (!normalizedQuery
      || artifact.title.toLocaleLowerCase().includes(normalizedQuery)
      || artifact.content.toLocaleLowerCase().includes(normalizedQuery)
      || anchor.quote.toLocaleLowerCase().includes(normalizedQuery))
  ));

  return visibleEntries.sort((left, right) => {
    if (sort === 'recent') {
      return right.artifact.updatedAt.localeCompare(left.artifact.updatedAt);
    }

    if (left.anchor.scope === 'document' && right.anchor.scope !== 'document') return -1;
    if (right.anchor.scope === 'document' && left.anchor.scope !== 'document') return 1;
    return left.anchor.startOffset - right.anchor.startOffset
      || right.artifact.updatedAt.localeCompare(left.artifact.updatedAt);
  });
}

function getHistoryCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'saved result' : 'saved results'}`;
}

function HistoryList({
  entries,
  activeArtifactId,
  onSelect,
}: {
  entries: WorkspaceSessionArtifact[];
  activeArtifactId: string | null;
  onSelect: (artifactId: string) => void;
}): ReactElement {
  if (entries.length === 0) {
    return (
      <p className="border-2 border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        No saved reading work matches these filters.
      </p>
    );
  }

  return (
    <ul className="divide-y-2 divide-border border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)]">
      {entries.map(({ artifact, anchor }) => {
        const isActive = artifact.id === activeArtifactId;
        return (
          <li key={artifact.id} className={isActive ? 'bg-secondary/30' : ''}>
            <button
              type="button"
              aria-current={isActive ? 'true' : undefined}
              className="min-h-20 w-full px-4 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => onSelect(artifact.id)}
            >
              <span className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wide">
                <ArtifactStatusIcon artifact={artifact} />
                {getArtifactLabel(artifact)}
              </span>
              <span className="mt-2 block line-clamp-2 font-sans text-sm leading-6">
                {anchor.scope === 'document' ? 'Entire document' : anchor.quote}
              </span>
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                {formatArtifactTimestamp(artifact)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function HistoryWorkspace({
  entries,
  readingPreferences,
  onOpenEntry,
  onRequestDeleteArtifact,
}: HistoryWorkspaceProps): ReactElement {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ArtifactFilter>('all');
  const [sort, setSort] = useState<HistorySort>('recent');
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const visibleEntries = useMemo(
    () => getFilteredEntries(entries, query, typeFilter, sort),
    [entries, query, sort, typeFilter],
  );
  const selectedEntry = visibleEntries.find(
    ({ artifact }) => artifact.id === selectedArtifactId,
  ) ?? visibleEntries[0] ?? null;

  return (
    <section aria-labelledby="history-heading" className="mx-auto h-full w-full max-w-[1500px] overflow-y-auto px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            Current session
          </p>
          <h2 id="history-heading" className="mt-1 text-2xl font-black">History</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Search saved explanations, notes, translations, vocabulary, and Close Readings.
          </p>
        </div>
        <p role="status" className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getHistoryCountLabel(visibleEntries.length)}
        </p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_14rem]">
        <label className="relative block">
          <Search className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search session history</span>
          <input
            type="search"
            value={query}
            placeholder="Search source or result…"
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full border-2 border-border bg-input ps-9 pe-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Filter history by type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ArtifactFilter)}
            className="h-11 w-full border-2 border-border bg-card px-3 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <option value="all">All types</option>
            <option value="explanation">Explanations</option>
            <option value="translation">Translations</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="note">Notes</option>
            <option value="close_read">Close Readings</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort session history</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as HistorySort)}
            className="h-11 w-full border-2 border-border bg-card px-3 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <option value="recent">Newest first</option>
            <option value="source">Source order</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
        <HistoryList
          entries={visibleEntries}
          activeArtifactId={selectedEntry?.artifact.id ?? null}
          onSelect={setSelectedArtifactId}
        />
        {selectedEntry ? (
          <article className="min-w-0 border-2 border-border bg-[#fbfbf8] shadow-[6px_6px_0px_0px_var(--border)]">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border bg-card p-4 font-mono">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  {getArtifactLabel(selectedEntry.artifact)}
                </p>
                <blockquote className="mt-2 line-clamp-3 border-s-4 border-secondary ps-3 font-sans text-sm leading-6">
                  {selectedEntry.anchor.scope === 'document'
                    ? 'Entire document'
                    : selectedEntry.anchor.quote}
                </blockquote>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenEntry(selectedEntry)}>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  {selectedEntry.artifact.type === 'close_read' ? 'Open Close Reading' : 'Open in Text'}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-error-foreground hover:bg-destructive hover:text-destructive-foreground"
                  aria-label={`Delete ${getArtifactLabel(selectedEntry.artifact)} output`}
                  onClick={() => onRequestDeleteArtifact(selectedEntry.artifact)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </header>
            <div className="mx-auto max-w-[68ch] px-5 py-6 sm:px-8">
              <ArtifactBody
                artifact={selectedEntry.artifact}
                variant="reading"
                readingPreferences={readingPreferences}
              />
            </div>
          </article>
        ) : (
          <div className="border-2 border-dashed border-border bg-card p-8 text-center">
            <h3 className="text-lg font-black">No saved work yet</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Explain a passage or start a Close Reading to build this session history.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
