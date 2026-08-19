import type { AnalysisStreamStage, AnalysisModel } from '@/types';
import type { TextAnchor } from '@/features/anchors';
import type { WorkspaceDocument } from '@/features/reading';
import {
  readApiErrorMessage,
  RemoteApiError,
  reportUnexpectedApiError,
} from '@/client-api/apiError';
import {
  consumeSseBuffer,
  type ParsedSseEvent,
} from '@/utils/parseSse';

export interface AnchorStreamMetadata {
  requestId: string;
  traceId: string;
  anchorId: string;
}

export type AnchorSkill = 'explain' | 'translate' | 'vocab';

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

  return readAnchorStream(response.body, callbacks);
}

export function runAnchorExplain(
  request: RunAnchorExplainRequest,
  callbacks: AnchorExplainCallbacks,
): Promise<AnchorExplainResult> {
  return runAnchorSkill({ ...request, skill: 'explain' }, callbacks);
}

async function readAnchorStream(
  body: ReadableStream<Uint8Array>,
  callbacks: AnchorExplainCallbacks,
): Promise<AnchorExplainResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = '';
  const finalMetadataRef: { current: AnchorStreamMetadata | null } = { current: null };

  const handleEvent = (event: ParsedSseEvent) => {
    const payload = JSON.parse(event.data) as AnchorSsePayload;
    const metadata = toMetadata(payload);
    finalMetadataRef.current = metadata;
    callbacks.onMetadata(metadata);

    if (event.event === 'stage' && payload.stage) {
      callbacks.onStage(payload.stage, metadata);
      return;
    }

    if (event.event === 'chunk' && payload.delta) {
      callbacks.onChunk(payload.delta, metadata);
      return;
    }

    if (event.event === 'done' && payload.result !== undefined) {
      finalResult = payload.result;
      return;
    }

    if (event.event === 'error') {
      throw new RemoteApiError(payload.message || 'Anchored explain failed');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
    buffer = consumeSseBuffer(buffer, handleEvent);
  }

  buffer += decoder.decode().replace(/\r/g, '');
  consumeSseBuffer(buffer, handleEvent);

  const metadata = finalMetadataRef.current;
  if (!metadata) {
    throw new Error('Stream ended before anchored metadata was received');
  }

  return {
    requestId: metadata.requestId,
    traceId: metadata.traceId,
    anchorId: metadata.anchorId,
    result: finalResult,
  };
}
