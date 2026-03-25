import { useState, useCallback, useEffect } from 'react';
import {
  parseSseBlock,
  type ParsedSseEvent,
  type StreamStagePayload,
  type StreamChunkPayload,
  type StreamDonePayload,
  type StreamErrorPayload,
} from '@/lib/parseSse';
import { useHistory, type HistoryItem } from './useHistory';

const STREAM_FLUSH_INTERVAL_MS = 40;

export type { HistoryItem };

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
  refreshApiKeyStatus: () => void;
  fetchHistory: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  onDeleteHistory: (id: number) => Promise<void>;
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

export function useAnalysis(): UseAnalysisReturn {
  const [text, setText] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamStage, setStreamStage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    () => !!localStorage.getItem('logosai_api_key'),
  );

  const { history, fetchHistory, deleteHistory, addHistory } = useHistory();

  const refreshApiKeyStatus = useCallback(() => {
    setHasApiKey(!!localStorage.getItem('logosai_api_key'));
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'logosai_api_key') {
        setHasApiKey(!!e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
    setStreamStage('');

    try {
      const storedKey = localStorage.getItem('logosai_api_key') ?? '';
      const storedModel = localStorage.getItem('logosai_model') ?? 'gemini-2.5-flash';

      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'X-Gemini-Key': storedKey,
        },
        body: JSON.stringify({ text, user_language: language, model: storedModel }),
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
      setStreamStage('');
    }
  }, [text, language, addHistory]);

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
    refreshApiKeyStatus,
    fetchHistory,
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
