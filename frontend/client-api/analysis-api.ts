import type { AnalysisStreamStage } from '@/types';
import {
  readApiErrorMessage,
  RemoteApiError,
  reportUnexpectedApiError,
} from '@/client-api/api-error';
import {
  type ParsedSseEvent,
  type StreamChunkPayload,
  type StreamDonePayload,
  type StreamErrorPayload,
  type StreamStagePayload,
} from '@/utils/parse-sse';
import { readSseStream } from './sse-stream';

const STREAM_FLUSH_INTERVAL_MS = 40;

export interface StreamAnalysisRequest {
  model: string;
  text: string;
  userLanguage: string;
  signal?: AbortSignal;
}

export interface StreamAnalysisCallbacks {
  onChunk: (chunk: string) => void;
  onStage: (stage: AnalysisStreamStage) => void;
}

export async function streamAnalysis(
  request: StreamAnalysisRequest,
  callbacks: StreamAnalysisCallbacks,
): Promise<string> {
  try {
    return await requestAnalysisStream(request, callbacks);
  } catch (error) {
    reportUnexpectedApiError(error, 'stream_analysis');
    throw error;
  }
}

async function requestAnalysisStream(
  request: StreamAnalysisRequest,
  callbacks: StreamAnalysisCallbacks,
): Promise<string> {
  const response = await fetch('/api/analyze/stream', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    signal: request.signal,
    body: JSON.stringify({
      text: request.text,
      user_language: request.userLanguage,
      model: request.model,
    }),
  });

  if (!response.ok) {
    throw new RemoteApiError(await readApiErrorMessage(response));
  }

  if (!response.body) {
    throw new Error('Streaming is not supported by the browser response');
  }

  return readAnalysisStream(response.body, callbacks);
}

async function readAnalysisStream(
  body: ReadableStream<Uint8Array>,
  callbacks: StreamAnalysisCallbacks,
): Promise<string> {
  let pendingChunk = '';
  let finalResult = '';
  let hasDoneEvent = false;
  let lastFlushAt = performance.now();

  const flushPendingChunk = () => {
    if (!pendingChunk) {
      return;
    }

    const nextChunk = pendingChunk;
    pendingChunk = '';
    callbacks.onChunk(nextChunk);
  };

  const handleSseEvent = (event: ParsedSseEvent) => {
    if (event.event === 'stage') {
      const payload = JSON.parse(event.data) as StreamStagePayload;
      callbacks.onStage(payload.stage);
      return;
    }

    if (event.event === 'chunk') {
      const payload = JSON.parse(event.data) as StreamChunkPayload;
      pendingChunk += payload.delta;

      if (performance.now() - lastFlushAt >= STREAM_FLUSH_INTERVAL_MS) {
        flushPendingChunk();
        lastFlushAt = performance.now();
      }
      return;
    }

    if (event.event === 'done') {
      const payload = JSON.parse(event.data) as StreamDonePayload;
      hasDoneEvent = true;
      finalResult = payload.result;
      return;
    }

    if (event.event === 'error') {
      const payload = JSON.parse(event.data) as StreamErrorPayload;
      throw new RemoteApiError(payload.message || 'Streaming analysis failed');
    }
  };

  await readSseStream(body, handleSseEvent);
  flushPendingChunk();

  if (!hasDoneEvent) {
    throw new Error('Stream ended unexpectedly before completion');
  }

  return finalResult;
}
