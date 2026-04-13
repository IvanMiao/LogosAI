import { useCallback, useState } from 'react';
import { streamAnalysis } from '@/client-api/analysisApi';
import type { AnalysisModel, AnalysisStreamStage, HistoryItem } from '@/types';
import { prependHistoryItem, readHistory, removeHistoryItem } from '@/utils/historyStorage';

export function useAnalysisPage({
  apiKey,
  hasApiKey,
  model,
}: {
  apiKey: string;
  hasApiKey: boolean;
  model: AnalysisModel;
}) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamStage, setStreamStage] = useState<AnalysisStreamStage | ''>('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory());

  const onAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter a text');
      setResult('');
      return;
    }

    if (!hasApiKey) {
      setError('Missing Gemini API key. Configure it in Settings.');
      setResult('');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setStreamStage('');

    try {
      const finalResult = await streamAnalysis(
        {
          apiKey,
          model,
          text,
          userLanguage: language,
        },
        {
          onChunk: (chunk) => setResult((previous) => previous + chunk),
          onStage: setStreamStage,
        },
      );

      const historyItem: HistoryItem = {
        id: Date.now(),
        prompt: text,
        result: finalResult,
        targetLanguage: language,
        timestamp: new Date().toISOString(),
      };

      setResult(finalResult);
      setHistory(prependHistoryItem(historyItem));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setStreamStage('');
    }
  }, [apiKey, hasApiKey, language, model, text]);

  const onDeleteHistory = useCallback((id: number) => {
    try {
      setHistory(removeHistoryItem(id));
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
  }, []);

  const onLoadHistory = useCallback((item: HistoryItem) => {
    setLanguage(item.targetLanguage.toLowerCase() || 'en');
    setText(item.prompt);
    setResult(item.result);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    text,
    setText,
    language,
    setLanguage,
    result,
    isLoading,
    streamStage,
    error,
    history,
    onAnalyze,
    onDeleteHistory,
    onLoadHistory,
  };
}
