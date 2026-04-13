import type { HistoryItem } from '@/types';

const HISTORY_STORAGE_KEY = 'logosai_history';

interface LegacyHistoryItem {
  id: number;
  prompt: string;
  result: string;
  target_language?: string;
  targetLanguage?: string;
  timestamp?: string;
}

function normalizeHistoryItem(item: LegacyHistoryItem): HistoryItem {
  return {
    id: item.id,
    prompt: item.prompt,
    result: item.result,
    targetLanguage: item.targetLanguage ?? item.target_language ?? 'en',
    timestamp: item.timestamp,
  };
}

export function readHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LegacyHistoryItem[];
    return parsed.map(normalizeHistoryItem);
  } catch {
    return [];
  }
}

export function writeHistory(items: HistoryItem[]): void {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export function prependHistoryItem(item: HistoryItem): HistoryItem[] {
  const updated = [item, ...readHistory()];
  writeHistory(updated);
  return updated;
}

export function removeHistoryItem(id: number): HistoryItem[] {
  const updated = readHistory().filter((item) => item.id !== id);
  writeHistory(updated);
  return updated;
}
