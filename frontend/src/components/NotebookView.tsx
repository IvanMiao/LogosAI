import { useMemo, useState } from 'react';
import {
  BookOpen,
  Trash2,
  Quote,
  MessageSquare,
  Book,
  Search,
  CalendarClock,
  Repeat2,
} from 'lucide-react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalysisContext } from '@/context/useAnalysisContext';
import type { VocabularyReviewStatus } from '@/hooks/useVocabularyNotebook';

type NotebookStatusFilter = 'all' | VocabularyReviewStatus;
type NotebookSortMode = 'newest' | 'oldest' | 'term' | 'recurrence';

const REVIEW_STATUS_LABEL: Record<VocabularyReviewStatus, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};

const SORT_MODE_LABEL: Record<NotebookSortMode, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  term: 'Term A-Z',
  recurrence: 'Most Repeated',
};

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimestamp(value: string): string {
  const parsed = parseTimestamp(value);
  if (!parsed) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
}

function getStatusPillClass(status: VocabularyReviewStatus): string {
  if (status === 'new') {
    return 'bg-yellow-300/30 border-yellow-500/60 text-foreground';
  }
  if (status === 'learning') {
    return 'bg-primary/15 border-primary/50 text-foreground';
  }
  return 'bg-emerald-500/20 border-emerald-600/40 text-foreground';
}

export function NotebookView() {
  const {
    vocabularyNotebook,
    onDeleteVocabulary,
    onClearVocabulary,
    onSetVocabularyReviewStatus,
    onSetVocabularyNote,
  } = useAnalysisContext();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<NotebookStatusFilter>('all');
  const [sortMode, setSortMode] = useState<NotebookSortMode>('newest');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>('');

  const statusSummary = useMemo(() => {
    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;

    for (const entry of vocabularyNotebook) {
      if (entry.reviewStatus === 'new') newCount += 1;
      if (entry.reviewStatus === 'learning') learningCount += 1;
      if (entry.reviewStatus === 'mastered') masteredCount += 1;
    }

    return {
      newCount,
      learningCount,
      masteredCount,
    };
  }, [vocabularyNotebook]);

  const recurrenceByTerm = useMemo(() => {
    const counter = new Map<string, number>();
    for (const entry of vocabularyNotebook) {
      const key = normalizeTerm(entry.term);
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    return counter;
  }, [vocabularyNotebook]);

  const visibleEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = vocabularyNotebook.filter((entry) => {
      if (statusFilter !== 'all' && entry.reviewStatus !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableFields = [
        entry.term,
        entry.sentence,
        entry.contextMeaning,
        entry.dictionaryMeaning,
        entry.note,
      ];

      return searchableFields.some((field) => field.toLowerCase().includes(query));
    });

    return filtered.sort((left, right) => {
      if (sortMode === 'newest') {
        return parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
      }
      if (sortMode === 'oldest') {
        return parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt);
      }
      if (sortMode === 'term') {
        return left.term.localeCompare(right.term, undefined, { sensitivity: 'base' });
      }

      const leftCount = recurrenceByTerm.get(normalizeTerm(left.term)) ?? 1;
      const rightCount = recurrenceByTerm.get(normalizeTerm(right.term)) ?? 1;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      return parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
    });
  }, [vocabularyNotebook, searchQuery, statusFilter, sortMode, recurrenceByTerm]);

  const filteredOutByControls =
    vocabularyNotebook.length > 0 && visibleEntries.length === 0;

  const handleStartNoteEdit = (entryId: string, initialNote: string) => {
    setEditingNoteId(entryId);
    setDraftNote(initialNote);
  };

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null);
    setDraftNote('');
  };

  const handleSaveNote = () => {
    if (!editingNoteId) return;
    onSetVocabularyNote(editingNoteId, draftNote);
    handleCancelNoteEdit();
  };

  const handleClearAll = () => {
    if (vocabularyNotebook.length === 0) return;
    if (window.confirm('Clear all notebook entries? This action cannot be undone.')) {
      onClearVocabulary();
    }
  };

  return (
    <div className="space-y-3">
      <section className="space-y-2 border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Vocabulary Notebook
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Quick review for recurring terms and meaning checks.
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={handleClearAll}
            disabled={vocabularyNotebook.length === 0}
            className="h-7 px-2.5 text-[11px] border border-border shadow-none self-start"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-[11px]">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">{vocabularyNotebook.length}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-[11px]">
            <span className="text-muted-foreground">New</span>
            <span className="font-semibold tabular-nums">{statusSummary.newCount}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-[11px]">
            <span className="text-muted-foreground">Learning</span>
            <span className="font-semibold tabular-nums">{statusSummary.learningCount}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-[11px]">
            <span className="text-muted-foreground">Mastered</span>
            <span className="font-semibold tabular-nums">{statusSummary.masteredCount}</span>
          </span>
        </div>
      </section>

      <section className="space-y-1.5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="notebook-search" className="sr-only">
              Search notebook entries
            </label>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="notebook-search"
              name="notebook-search"
              type="text"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search term, sentence, or meaning…"
              className="h-8 w-full rounded-md border border-border/70 bg-background pl-8 pr-2 text-xs touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as NotebookStatusFilter)}
            >
              <SelectTrigger
                aria-label="Filter notebook entries by status"
                className="h-8 w-full border border-border/70 bg-background text-xs shadow-none md:w-[145px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="mastered">Mastered</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortMode}
              onValueChange={(value) => setSortMode(value as NotebookSortMode)}
            >
              <SelectTrigger
                aria-label="Sort notebook entries"
                className="h-8 w-full border border-border/70 bg-background text-xs shadow-none md:w-[160px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{SORT_MODE_LABEL.newest}</SelectItem>
                <SelectItem value="oldest">{SORT_MODE_LABEL.oldest}</SelectItem>
                <SelectItem value="term">{SORT_MODE_LABEL.term}</SelectItem>
                <SelectItem value="recurrence">{SORT_MODE_LABEL.recurrence}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription className="text-[11px]">
          Showing {visibleEntries.length} of {vocabularyNotebook.length} entries.
        </CardDescription>
      </section>

      {vocabularyNotebook.length === 0 ? (
        <Card className="border-border shadow-[2px_2px_0px_0px_var(--border)]">
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              No vocabulary saved yet. Enable the vocabulary option before analyzing text.
            </p>
          </CardContent>
        </Card>
      ) : filteredOutByControls ? (
        <Card className="border-border shadow-[2px_2px_0px_0px_var(--border)]">
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              No entries match current filters. Try resetting search, status, or sort.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleEntries.map((entry) => (
            <Card
              key={entry.id}
              className="flex flex-col border border-border/80 bg-card shadow-[1px_1px_0px_0px_var(--border)] transition-shadow duration-150 hover:shadow-[2px_2px_0px_0px_var(--border)]"
            >
              <CardContent className="flex h-full flex-col gap-2.5 p-3.5">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <h3 className="min-w-0 break-words text-[15px] font-semibold leading-tight text-foreground">
                        {entry.term}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getStatusPillClass(entry.reviewStatus)}`}
                      >
                        {REVIEW_STATUS_LABEL[entry.reviewStatus]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5">
                        <Repeat2 className="h-3 w-3" aria-hidden="true" />
                        {recurrenceByTerm.get(normalizeTerm(entry.term)) ?? 1}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5">
                        <CalendarClock className="h-3 w-3" aria-hidden="true" />
                        {formatTimestamp(entry.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteVocabulary(entry.id)}
                    aria-label={`Delete notebook entry for ${entry.term}`}
                    className="-mr-1 -mt-1 h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground">
                    <Quote className="h-3.5 w-3.5" aria-hidden="true" />
                    Context
                  </div>
                  <p className="mt-1 break-words text-[13px] italic leading-relaxed text-foreground/85">
                    "{entry.sentence}"
                  </p>
                </div>

                <div className="grid gap-2">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      Usage
                    </div>
                    <p className="break-words text-[13px] text-foreground">{entry.contextMeaning}</p>
                  </div>
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground">
                      <Book className="h-3.5 w-3.5" aria-hidden="true" />
                      Dictionary
                    </div>
                    <p className="break-words text-[13px] text-foreground">{entry.dictionaryMeaning}</p>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <div className="flex flex-wrap gap-1">
                    {(['new', 'learning', 'mastered'] as const).map((status) => {
                      const isActive = entry.reviewStatus === status;
                      return (
                        <button
                          key={`${entry.id}-${status}`}
                          type="button"
                          onClick={() => onSetVocabularyReviewStatus(entry.id, status)}
                          aria-label={`Set ${entry.term} status to ${REVIEW_STATUS_LABEL[status]}`}
                          className={`h-6 rounded-md border px-2 text-[10px] font-medium touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            isActive
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {REVIEW_STATUS_LABEL[status]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingNoteId === entry.id ? (
                  <div className="space-y-2 border-t border-border/60 pt-2">
                    <Textarea
                      value={draftNote}
                      onChange={(event) => setDraftNote(event.target.value)}
                      rows={3}
                      maxLength={240}
                      className="resize-none border border-border/70 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      placeholder="Add a memory trigger…"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{draftNote.length}/240</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelNoteEdit}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          Cancel
                        </button>
                        <Button
                          type="button"
                          onClick={handleSaveNote}
                          className="h-7 border border-border px-2.5 text-[11px]"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end border-t border-border/60 pt-2">
                    <button
                      type="button"
                      onClick={() => handleStartNoteEdit(entry.id, entry.note)}
                      className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {entry.note ? 'Edit note' : 'Add note'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
