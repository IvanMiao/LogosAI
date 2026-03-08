import { useState, useCallback } from 'react';

const STORAGE_KEY = 'logosai_history';
const STREAM_FLUSH_INTERVAL_MS = 40;

type StreamStage = 'detect' | 'correct' | 'interpret';

interface ParsedSseEvent {
  event: string;
  data: string;
}

interface StreamStagePayload {
  stage: StreamStage;
}

interface StreamChunkPayload {
  delta: string;
}

interface StreamDonePayload {
  result: string;
}

interface StreamErrorPayload {
  message: string;
}

function parseSseBlock(block: string): ParsedSseEvent | null {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event: eventName,
    data: dataLines.join('\n'),
  };
}

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
  streamStage: string;
  error: string;
  fetchHistory: () => Promise<void>;
  onAnalyze: () => Promise<void>;
  onDeleteHistory: (id: number) => Promise<void>;
  onLoadHistory: (item: HistoryItem) => void;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useAnalysis(): UseAnalysisReturn {
  // Member Variables
  const [text, setText] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [result, setResult] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamStage, setStreamStage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Member Functions
  const fetchHistory = useCallback(async () => {
    try {
      const items = loadHistory();
      setHistory(items);
    } catch (e) {
      console.error('Failed to load history:', e);
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
    setStreamStage('');

    try {
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          user_language: language,
        }),
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let pendingChunk = '';
      let finalResult = '';
      let hasDoneEvent = false;
      let lastFlushAt = performance.now();

      const flushPendingChunk = () => {
        if (!pendingChunk) {
          return;
        }
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

      const consumeBuffer = () => {
        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
          const block = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          const parsedEvent = parseSseBlock(block);
          if (parsedEvent) {
            handleSseEvent(parsedEvent);
          }
          boundaryIndex = buffer.indexOf('\n\n');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        consumeBuffer();
      }

      buffer += decoder.decode().replace(/\r/g, '');
      consumeBuffer();
      flushPendingChunk();

      if (!hasDoneEvent) {
        throw new Error('Stream ended unexpectedly before completion');
      }

      setResult(finalResult);

      const newItem: HistoryItem = {
        id: Date.now(),
        prompt: text,
        result: finalResult,
        target_language: language,
        timestamp: new Date().toISOString(),
      };
      const updated = [newItem, ...loadHistory()];
      saveHistory(updated);
      setHistory(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
      setStreamStage('');
    }
  }, [text, language]);

  const handleDeleteHistory = async (id: number) => {
    try {
      const updated = loadHistory().filter((item) => item.id !== id);
      saveHistory(updated);
      setHistory(updated);
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
    streamStage,
    error,
    fetchHistory,
    onAnalyze: handleAnalyze,
    onDeleteHistory: handleDeleteHistory,
    onLoadHistory: handleLoadHistory,
  };
}
