import type { AnalysisStreamStage } from '@/types';

export interface ParsedSseEvent {
  event: string;
  data: string;
}

export interface StreamStagePayload {
  stage: AnalysisStreamStage;
}

export interface StreamChunkPayload {
  delta: string;
}

export interface StreamDonePayload {
  result: string;
}

export interface StreamErrorPayload {
  message: string;
}

export function parseSseBlock(block: string): ParsedSseEvent | null {
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

export function consumeSseBuffer(
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
