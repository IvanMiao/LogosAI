export interface ParsedSseEvent {
  event: string;
  data: string;
}

export interface StreamStagePayload {
  stage: 'detect' | 'correct' | 'interpret';
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
