import { useState, useCallback } from 'react';

const STORAGE_KEY = 'logosai_history';

export interface HistoryItem {
  id: number;
  prompt: string;
  result: string;
  target_language: string;
  timestamp?: string;
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  const fetchHistory = useCallback( () => {
    try {
      const items = loadHistory();
      setHistory(items);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  const deleteHistory = (id: number) => {
    try {
      const updated = loadHistory().filter((item) => item.id !== id);
      saveHistory(updated);
      setHistory(updated);
    } catch (e) {
      console.error('Failed to delete history:', e);
    }
  };

  const addHistory = (item: HistoryItem) => {
    const updated = [item, ...loadHistory()];
    saveHistory(updated);
    setHistory(updated);
  };

  return { history, fetchHistory, deleteHistory, addHistory };
}
