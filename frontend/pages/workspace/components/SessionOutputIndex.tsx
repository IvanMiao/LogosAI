import { useMemo, useState, type ReactElement } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Artifact } from '@/features/artifacts';
import type { WorkspaceSessionArtifact } from '../workspace.types';
import {
  formatArtifactTimestamp,
  getArtifactLabel,
  getArtifactStatusLabel,
} from './artifact-display.helpers';

type ArtifactFilter = 'all' | Artifact['type'];

interface SessionOutputIndexProps {
  outputs: WorkspaceSessionArtifact[];
  onOpenArtifact: (artifactId: string) => void;
}

function getOutputCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'output' : 'outputs'}`;
}

function getVisibleOutputs(
  outputs: WorkspaceSessionArtifact[],
  query: string,
  typeFilter: ArtifactFilter,
): WorkspaceSessionArtifact[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return outputs.filter(({ artifact, anchor }) => (
    (typeFilter === 'all' || artifact.type === typeFilter)
    && (!normalizedQuery
      || artifact.title.toLocaleLowerCase().includes(normalizedQuery)
      || artifact.content.toLocaleLowerCase().includes(normalizedQuery)
      || anchor.quote.toLocaleLowerCase().includes(normalizedQuery))
  ));
}

function matchesOutputContent(artifact: Artifact, query: string): boolean {
  return Boolean(query) && artifact.content.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function SessionOutputIndex({
  outputs,
  onOpenArtifact,
}: SessionOutputIndexProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ArtifactFilter>('all');
  const visibleOutputs = useMemo(
    () => getVisibleOutputs(outputs, query, typeFilter),
    [outputs, query, typeFilter],
  );

  return (
    <section className="mt-5">
      <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer border-2 border-border bg-card px-3 py-3 text-sm font-black shadow-[2px_2px_0px_0px_var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Session outputs · {getOutputCountLabel(outputs.length)}
        </summary>
        <div className="border-x-2 border-b-2 border-border bg-card p-3">
          <label className="relative block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search session outputs</span>
            <input
              type="search"
              value={query}
              placeholder="Search output or source text…"
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full border-2 border-border bg-input pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            />
          </label>
          <label className="mt-2 block">
            <span className="sr-only">Filter session outputs by type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as ArtifactFilter)}
              className="h-11 w-full border-2 border-border bg-background px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All output types</option>
              <option value="explanation">Explanations</option>
              <option value="translation">Translations</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="note">Notes</option>
              <option value="close_read">Close Readings</option>
            </select>
          </label>
          <p role="status" className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {getOutputCountLabel(visibleOutputs.length)}
          </p>
          {visibleOutputs.length > 0 ? (
            <ul className="mt-2 divide-y-2 divide-border border-2 border-border bg-background">
              {visibleOutputs.map(({ artifact, anchor }) => (
                <li key={artifact.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left"
                    aria-label={`Open ${getArtifactLabel(artifact)} for ${anchor.quote}`}
                    onClick={() => onOpenArtifact(artifact.id)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{getArtifactLabel(artifact)}</span>
                      <span className="mt-1 block line-clamp-1 font-sans text-xs font-normal leading-5 text-muted-foreground">
                        {anchor.quote}
                      </span>
                      <span className="mt-1 block text-[10px] font-bold uppercase text-muted-foreground">
                        {formatArtifactTimestamp(artifact)}
                        {' · '}
                        {getArtifactStatusLabel(artifact.status)}
                      </span>
                      {matchesOutputContent(artifact, query) ? (
                        <span className="mt-1 block text-[10px] font-bold uppercase text-muted-foreground">
                          Matches output text
                        </span>
                      ) : null}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 border-2 border-dashed border-border p-3 text-sm leading-6 text-muted-foreground">
              {outputs.length === 0
                ? 'Outputs created from this session will appear here.'
                : 'No session outputs match this search.'}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
