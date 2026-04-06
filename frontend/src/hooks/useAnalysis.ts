import { useState, useCallback } from 'react';
import {
  parseSseBlock,
  type ParsedSseEvent,
  type StreamStagePayload,
  type StreamChunkPayload,
  type StreamDonePayload,
  type StreamErrorPayload,
} from '@/lib/parseSse';
import { useHistory, type HistoryItem } from './useHistory';
import {
  useVocabularyNotebook,
  type VocabularyApiItem,
  type VocabularyNotebookEntry,
  type VocabularyReviewStatus,
} from './useVocabularyNotebook';

const STREAM_FLUSH_INTERVAL_MS = 40;

export type { HistoryItem };

export interface UseAnalysisOptions {
  apiKey: string;
  hasApiKey: boolean;
  model: string;
}

export interface UseAnalysisReturn {
  text: string;
  setText: (text: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  result: string;
  history: HistoryItem[];
  isLoading: boolean;
  streamStage: string;
  error: string;
  hasApiKey: boolean;
  extractVocabularyEnabled: boolean;
  setExtractVocabularyEnabled: (enabled: boolean) => void;
  vocabularyNotebook: VocabularyNotebookEntry[];
  onDeleteVocabulary: (id: string) => void;
  onClearVocabulary: () => void;
  onSetVocabularyReviewStatus: (id: string, reviewStatus: VocabularyReviewStatus) => void;
  onSetVocabularyNote: (id: string, note: string) => void;
  onAnalyze: () => Promise<void>;
  onDeleteHistory: (id: number) => void;
  onLoadHistory: (item: HistoryItem) => void;
}

function consumeSseStream(
  buffer: string,
  onEvent: (event: ParsedSseEvent) => void,
): string {
  let boundaryIndex = buffer.indexOf('\n\n');
  while (boundaryIndex !== -1) {
    const block = buffer.slice(0, boundaryIndex);
    buffer = buffer.slice(boundaryIndex + 2);
    const parsedEvent = parseSseBlock(block);
    if (parsedEvent) {
      onEvent(parsedEvent);
    }
    boundaryIndex = buffer.indexOf('\n\n');
  }
  return buffer;
}

export function useAnalysis({
  apiKey,
  hasApiKey,
  model,
}: UseAnalysisOptions): UseAnalysisReturn {
  const [text, setText] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamStage, setStreamStage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [extractVocabularyEnabled, setExtractVocabularyEnabled] = useState<boolean>(false);

  const { history, deleteHistory, addHistory } = useHistory();
  const {
    entries: vocabularyNotebook,
    addVocabularyEntries,
    removeVocabularyEntry,
    clearVocabularyEntries,
    setVocabularyReviewStatus,
    setVocabularyNote,
  } = useVocabularyNotebook();

  const requestVocabularyExtraction = useCallback(
    async (sourceText: string, learnerLanguage: string): Promise<VocabularyApiItem[]> => {
      const response = await fetch('/api/vocabulary/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Key': apiKey,
        },
        body: JSON.stringify({
          text: sourceText,
          max_items: 10,
          user_language: learnerLanguage.toUpperCase(),
          model,
        }),
      });

      if (!response.ok) {
        let message = `Vocabulary API failed with status ${response.status}`;
        try {
          const errorData = (await response.json()) as { detail?: string };
          if (errorData.detail) {
            message = errorData.detail;
          }
        } catch {
          // Ignore parse errors and keep fallback message.
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        items: VocabularyApiItem[];
      };

      if (!payload.success) {
        throw new Error(payload.error || 'Vocabulary extraction failed');
      }

      return payload.items;
    },
    [apiKey, model],
  );

  const handleAnalyze = useCallback(async () => {
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
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'X-Gemini-Key': apiKey,
        },
        body: JSON.stringify({ text, user_language: language, model }),
      });

      if (!response.ok) {
        let message = `HTTP Error! Status: ${response.status}`;
        try {
          const errorData = (await response.json()) as { detail?: string };
          if (errorData.detail) {
            message = errorData.detail;
          }
        } catch {
          // Ignore JSON parse failure and fallback to status code message.
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error('Streaming is not supported by the browser response');
      }

      const finalResult = await readSseStream(response.body, setResult, setStreamStage);

      setResult(finalResult);

      addHistory({
        id: Date.now(),
        prompt: text,
        result: finalResult,
        target_language: language,
        timestamp: new Date().toISOString(),
      });

      if (extractVocabularyEnabled) {
        try {
          const vocabularyItems = await requestVocabularyExtraction(text, language);
          addVocabularyEntries(vocabularyItems);
        } catch (vocabularyError) {
          const vocabularyMessage =
            vocabularyError instanceof Error
              ? vocabularyError.message
              : String(vocabularyError);
          setError(`Analysis completed, but vocabulary extraction failed: ${vocabularyMessage}`);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
      setStreamStage('');
    }
  }, [
    text,
    language,
    addHistory,
    apiKey,
    hasApiKey,
    model,
    extractVocabularyEnabled,
    requestVocabularyExtraction,
    addVocabularyEntries,
  ]);

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
    streamStage,
    error,
    hasApiKey,
    extractVocabularyEnabled,
    setExtractVocabularyEnabled,
    vocabularyNotebook,
    onDeleteVocabulary: removeVocabularyEntry,
    onClearVocabulary: clearVocabularyEntries,
    onSetVocabularyReviewStatus: setVocabularyReviewStatus,
    onSetVocabularyNote: setVocabularyNote,
    onAnalyze: handleAnalyze,
    onDeleteHistory: deleteHistory,
    onLoadHistory: handleLoadHistory,
  };
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  setResult: (updater: (prev: string) => string) => void,
  setStreamStage: (stage: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let pendingChunk = '';
  let finalResult = '';
  let hasDoneEvent = false;
  let lastFlushAt = performance.now();

  const flushPendingChunk = () => {
    if (!pendingChunk) return;
    const chunk = pendingChunk;
    pendingChunk = '';
    setResult((previous) => previous + chunk);
  };

  const handleSseEvent = (parsedEvent: ParsedSseEvent) => {
    if (parsedEvent.event === 'stage') {
      const payload = JSON.parse(parsedEvent.data) as StreamStagePayload;
      setStreamStage(payload.stage);
      return;
    }

    if (parsedEvent.event === 'chunk') {
      const payload = JSON.parse(parsedEvent.data) as StreamChunkPayload;
      pendingChunk += payload.delta;
      // Throttle React state updates to avoid excessive re-renders
      if (performance.now() - lastFlushAt >= STREAM_FLUSH_INTERVAL_MS) {
        flushPendingChunk();
        lastFlushAt = performance.now();
      }
      return;
    }

    if (parsedEvent.event === 'done') {
      const payload = JSON.parse(parsedEvent.data) as StreamDonePayload;
      hasDoneEvent = true;
      finalResult = payload.result;
      return;
    }

    if (parsedEvent.event === 'error') {
      const payload = JSON.parse(parsedEvent.data) as StreamErrorPayload;
      throw new Error(payload.message || 'Streaming analysis failed');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
    buffer = consumeSseStream(buffer, handleSseEvent);
  }

  buffer += decoder.decode().replace(/\r/g, '');
  consumeSseStream(buffer, handleSseEvent);
  flushPendingChunk();

  if (!hasDoneEvent) {
    throw new Error('Stream ended unexpectedly before completion');
  }

  return finalResult;
}
