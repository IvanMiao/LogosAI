import { useState, useCallback } from 'react';

export interface HistoryItem {
  id: number;
  prompt: string;
  result: string;
  target_language: string;
  timestamp?: string;
}

export interface UseAnalysisReturn {
  text: string;
  setText: (text: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  result: string;
  history: HistoryItem[];
  isLoading: boolean;
  error: string;
  fetchHistory: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  onDeleteHistory: (id: number) => Promise<void>;
  onLoadHistory: (item: HistoryItem) => void;
}

export function useAnalysis(): UseAnalysisReturn {
  // Member Variables
  const [text, setText] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [result, setResult] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Member Functions
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistory(data.history);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter a text');
      setResult('');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          user_language: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        fetchHistory();
      } else {
        throw new Error(data.error || 'Analysis failed, no specific error information returned');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [text, language, fetchHistory]);

  const handleDeleteHistory = async (id: number) => {
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchHistory();
      }
    } catch (e) {
      console.error('Failed to delete history:', e);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setLanguage(item.target_language.toLowerCase() || 'en');
    setText(item.prompt);
    setResult(item.result);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    text,
    setText,
    language,
    setLanguage,
    result,
    history,
    isLoading,
    error,
    fetchHistory,
    onAnalyze: handleAnalyze,
    onDeleteHistory: handleDeleteHistory,
    onLoadHistory: handleLoadHistory,
  };
}
