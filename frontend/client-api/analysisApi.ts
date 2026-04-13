import type { AnalysisStreamStage } from '@/types';
import {
  consumeSseBuffer,
  type ParsedSseEvent,
  type StreamChunkPayload,
  type StreamDonePayload,
  type StreamErrorPayload,
  type StreamStagePayload,
} from '@/utils/parseSse';

const STREAM_FLUSH_INTERVAL_MS = 40;

export interface StreamAnalysisRequest {
  apiKey: string;
  model: string;
  text: string;
  userLanguage: string;
}

export interface StreamAnalysisCallbacks {
  onChunk: (chunk: string) => void;
  onStage: (stage: AnalysisStreamStage) => void;
}

export async function streamAnalysis(
  request: StreamAnalysisRequest,
  callbacks: StreamAnalysisCallbacks,
): Promise<string> {
  const response = await fetch('/api/analyze/stream', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Gemini-Key': request.apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      user_language: request.userLanguage,
      model: request.model,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!response.body) {
    throw new Error('Streaming is not supported by the browser response');
  }

  return readAnalysisStream(response.body, callbacks);
}

async function readApiError(response: Response): Promise<string> {
  let message = `HTTP Error! Status: ${response.status}`;

  try {
    const errorData = (await response.json()) as { detail?: string };
    if (errorData.detail) {
      message = errorData.detail;
    }
  } catch {
    // Ignore JSON parse failure and fall back to the status code message.
  }

  return message;
}

async function readAnalysisStream(
  body: ReadableStream<Uint8Array>,
  callbacks: StreamAnalysisCallbacks,
): Promise<string> {
  const reader = body.getReader();
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
      throw new Error(payload.message || 'Streaming analysis failed');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
    buffer = consumeSseBuffer(buffer, handleSseEvent);
  }

  buffer += decoder.decode().replace(/\r/g, '');
  consumeSseBuffer(buffer, handleSseEvent);
  flushPendingChunk();

  if (!hasDoneEvent) {
    throw new Error('Stream ended unexpectedly before completion');
  }

  return finalResult;
}
