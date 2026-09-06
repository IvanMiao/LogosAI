import type { AnalysisStreamStage, AnalysisModel } from '@/types';
import type { AnchorSkill, TextAnchor } from '@/features/anchors';
import type { WorkspaceDocument } from '@/features/reading';
import {
  readApiErrorMessage,
  RemoteApiError,
  reportUnexpectedApiError,
} from '@/client-api/api-error';
import type { ParsedSseEvent } from '@/utils/parse-sse';
import { readSseStream } from './sse-stream';

export interface AnchorStreamMetadata {
  requestId: string;
  traceId: string;
  anchorId: string;
}

export interface RunAnchorExplainRequest {
  model: AnalysisModel;
  document: WorkspaceDocument;
  anchor: TextAnchor;
  skill?: AnchorSkill;
  userLanguage: string;
  signal?: AbortSignal;
}

export interface AnchorExplainCallbacks {
  onChunk: (chunk: string, metadata: AnchorStreamMetadata) => void;
  onStage: (stage: AnalysisStreamStage, metadata: AnchorStreamMetadata) => void;
  onMetadata: (metadata: AnchorStreamMetadata) => void;
}

interface AnchorSsePayload {
  request_id: string;
  trace_id: string;
  anchor_id: string;
  stage?: AnalysisStreamStage;
  delta?: string;
  result?: string;
  message?: string;
}

export interface AnchorExplainResult extends AnchorStreamMetadata {
  result: string;
}

function toMetadata(payload: AnchorSsePayload): AnchorStreamMetadata {
  return {
    requestId: payload.request_id,
    traceId: payload.trace_id,
    anchorId: payload.anchor_id,
  };
}

export async function runAnchorSkill(
  request: RunAnchorExplainRequest,
  callbacks: AnchorExplainCallbacks,
): Promise<AnchorExplainResult> {
  try {
    return await requestAnchorSkill(request, callbacks);
  } catch (error) {
    reportUnexpectedApiError(error, 'run_anchor_skill');
    throw error;
  }
}

async function requestAnchorSkill(
  request: RunAnchorExplainRequest,
  callbacks: AnchorExplainCallbacks,
): Promise<AnchorExplainResult> {
  const skill = request.skill ?? 'explain';
  const response = await fetch('/api/anchors/run', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    signal: request.signal,
    body: JSON.stringify({
      document: {
        id: request.document.id,
        title: request.document.title,
        text: request.document.text,
      },
      anchor: {
        id: request.anchor.id,
        quote: request.anchor.quote,
        start_offset: request.anchor.startOffset,
        end_offset: request.anchor.endOffset,
        scope: request.anchor.scope,
      },
      skill,
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

  return readAnchorStream(response.body, request.anchor.id, callbacks);
}

interface AnchorStreamState {
  metadata: AnchorStreamMetadata | null;
  result: string | null;
}

function requireMetadata(
  payload: AnchorSsePayload,
  expectedAnchorId: string,
  previous: AnchorStreamMetadata | null,
): AnchorStreamMetadata {
  const metadata = toMetadata(payload);
  if (typeof metadata.requestId !== 'string' || !metadata.requestId
    || typeof metadata.traceId !== 'string' || !metadata.traceId
    || metadata.anchorId !== expectedAnchorId) {
    throw new Error('Invalid anchored stream identity');
  }
  if (previous && (previous.requestId !== metadata.requestId
    || previous.traceId !== metadata.traceId)) {
    throw new Error('Anchored stream identity changed before completion');
  }
  return metadata;
}

function handleAnchorEvent(
  event: ParsedSseEvent,
  state: AnchorStreamState,
  anchorId: string,
  callbacks: AnchorExplainCallbacks,
): void {
  if (!['stage', 'chunk', 'done', 'error'].includes(event.event)) return;
  const payload = JSON.parse(event.data) as AnchorSsePayload;
  const metadata = requireMetadata(payload, anchorId, state.metadata);
  if (event.event === 'error') {
    throw new RemoteApiError(payload.message || 'Anchored explain failed');
  }
  if (state.result !== null) {
    throw new Error('Anchored stream received an event after completion');
  }
  if (!state.metadata) callbacks.onMetadata(metadata);
  state.metadata = metadata;

  dispatchAnchorPayload(event.event, payload, metadata, state, callbacks);
}

function dispatchAnchorPayload(
  eventName: string,
  payload: AnchorSsePayload,
  metadata: AnchorStreamMetadata,
  state: AnchorStreamState,
  callbacks: AnchorExplainCallbacks,
): void {
  switch (eventName) {
    case 'stage':
      if (payload.stage) callbacks.onStage(payload.stage, metadata);
      break;
    case 'chunk':
      if (payload.delta) callbacks.onChunk(payload.delta, metadata);
      break;
    case 'done':
      if (typeof payload.result !== 'string' || !payload.result.trim()) {
        throw new Error('Anchored stream completed without a result');
      }
      state.result = payload.result;
      break;
  }
}

async function readAnchorStream(
  body: ReadableStream<Uint8Array>,
  anchorId: string,
  callbacks: AnchorExplainCallbacks,
): Promise<AnchorExplainResult> {
  const state: AnchorStreamState = { metadata: null, result: null };
  await readSseStream(body, (event) => handleAnchorEvent(event, state, anchorId, callbacks));
  if (!state.metadata || state.result === null) {
    throw new Error('Stream ended unexpectedly before completion');
  }
  return { ...state.metadata, result: state.result };
}
