import type { HistoryItem } from '@/types';
import { readScopedStorage, writeScopedStorage } from './scoped-storage';

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

export function readHistory(storageScope?: string): HistoryItem[] {
  try {
    const raw = readScopedStorage(HISTORY_STORAGE_KEY, storageScope);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LegacyHistoryItem[];
    return parsed.map(normalizeHistoryItem);
  } catch {
    return [];
  }
}

export function writeHistory(items: HistoryItem[], storageScope?: string): void {
  writeScopedStorage(HISTORY_STORAGE_KEY, JSON.stringify(items), storageScope);
}

export function prependHistoryItem(
  item: HistoryItem,
  storageScope?: string,
): HistoryItem[] {
  const updated = [item, ...readHistory(storageScope)];
  writeHistory(updated, storageScope);
  return updated;
}

export function removeHistoryItem(id: number, storageScope?: string): HistoryItem[] {
  const updated = readHistory(storageScope).filter((item) => item.id !== id);
  writeHistory(updated, storageScope);
  return updated;
}
