import { useState } from 'react';

const STORAGE_KEY = 'logosai_vocabulary_notebook';
const REVIEW_STATUSES = ['new', 'learning', 'mastered'] as const;

export type VocabularyReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface VocabularyNotebookEntry {
  id: string;
  term: string;
  sentence: string;
  contextMeaning: string;
  dictionaryMeaning: string;
  createdAt: string;
  updatedAt: string;
  reviewStatus: VocabularyReviewStatus;
  note: string;
}

export interface VocabularyApiItem {
  term: string;
  sentence: string;
  context_meaning: string;
  dictionary_meaning: string;
}

function isVocabularyReviewStatus(value: unknown): value is VocabularyReviewStatus {
  return typeof value === 'string' && REVIEW_STATUSES.includes(value as VocabularyReviewStatus);
}

function createEntryId(): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

  return `${Date.now()}-${randomPart}`;
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

function normalizeSentence(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim();
}

function entryKey(item: Pick<VocabularyNotebookEntry, 'term' | 'sentence'>): string {
  return `${normalizeTerm(item.term)}::${normalizeSentence(item.sentence)}`;
}

function parseIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

function migrateVocabularyEntry(rawItem: unknown): VocabularyNotebookEntry | null {
  if (!rawItem || typeof rawItem !== 'object') return null;

  const item = rawItem as Record<string, unknown>;
  const term = typeof item.term === 'string' ? item.term.trim() : '';
  const sentence = typeof item.sentence === 'string' ? normalizeSentence(item.sentence) : '';
  const contextMeaning = typeof item.contextMeaning === 'string' ? item.contextMeaning.trim() : '';
  const dictionaryMeaning =
    typeof item.dictionaryMeaning === 'string' ? item.dictionaryMeaning.trim() : '';

  if (!term || !sentence || !contextMeaning || !dictionaryMeaning) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = parseIsoDate(item.createdAt, now);
  const updatedAt = parseIsoDate(item.updatedAt, createdAt);

  return {
    id: typeof item.id === 'string' && item.id ? item.id : createEntryId(),
    term,
    sentence,
    contextMeaning,
    dictionaryMeaning,
    createdAt,
    updatedAt,
    reviewStatus: isVocabularyReviewStatus(item.reviewStatus) ? item.reviewStatus : 'new',
    note: typeof item.note === 'string' ? item.note.trim() : '',
  };
}

export function loadVocabularyNotebook(): VocabularyNotebookEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(migrateVocabularyEntry)
      .filter((item): item is VocabularyNotebookEntry => item !== null);
  } catch {
    return [];
  }
}

function saveVocabularyNotebook(items: VocabularyNotebookEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function mergeVocabularyEntries(
  currentItems: VocabularyNotebookEntry[],
  newItems: VocabularyApiItem[],
): VocabularyNotebookEntry[] {
  const existingKeys = new Set(currentItems.map((item) => entryKey(item)));
  const mapped: VocabularyNotebookEntry[] = [];

  for (const item of newItems) {
    const term = item.term.trim();
    const sentence = normalizeSentence(item.sentence);
    const contextMeaning = item.context_meaning.trim();
    const dictionaryMeaning = item.dictionary_meaning.trim();

    if (!term || !sentence || !contextMeaning || !dictionaryMeaning) {
      continue;
    }

    const key = entryKey({ term, sentence });
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    const now = new Date().toISOString();
    mapped.push({
      id: createEntryId(),
      term,
      sentence,
      contextMeaning,
      dictionaryMeaning,
      createdAt: now,
      updatedAt: now,
      reviewStatus: 'new',
      note: '',
    });
  }

  return [...mapped, ...currentItems];
}

function updateVocabularyEntry(
  entries: VocabularyNotebookEntry[],
  id: string,
  update: Partial<Pick<VocabularyNotebookEntry, 'reviewStatus' | 'note'>>,
): VocabularyNotebookEntry[] {
  const nextEntries = entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ...update,
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );

  return nextEntries;
}

export function useVocabularyNotebook() {
  const [entries, setEntries] = useState<VocabularyNotebookEntry[]>(loadVocabularyNotebook);

  const addVocabularyEntries = (items: VocabularyApiItem[]) => {
    setEntries((currentEntries) => {
      const merged = mergeVocabularyEntries(currentEntries, items);
      saveVocabularyNotebook(merged);
      return merged;
    });
  };

  const removeVocabularyEntry = (id: string) => {
    setEntries((currentEntries) => {
      const updated = currentEntries.filter((item) => item.id !== id);
      saveVocabularyNotebook(updated);
      return updated;
    });
  };

  const clearVocabularyEntries = () => {
    setEntries(() => {
      saveVocabularyNotebook([]);
      return [];
    });
  };

  const setVocabularyReviewStatus = (id: string, reviewStatus: VocabularyReviewStatus) => {
    setEntries((currentEntries) => {
      const updated = updateVocabularyEntry(currentEntries, id, { reviewStatus });
      saveVocabularyNotebook(updated);
      return updated;
    });
  };

  const setVocabularyNote = (id: string, note: string) => {
    setEntries((currentEntries) => {
      const updated = updateVocabularyEntry(currentEntries, id, { note: note.trim() });
      saveVocabularyNotebook(updated);
      return updated;
    });
  };

  return {
    entries,
    addVocabularyEntries,
    removeVocabularyEntry,
    clearVocabularyEntries,
    setVocabularyReviewStatus,
    setVocabularyNote,
  };
}
