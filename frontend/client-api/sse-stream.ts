import { consumeSseBuffer, type ParsedSseEvent } from '@/utils/parse-sse';

export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ParsedSseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
      buffer = consumeSseBuffer(buffer, onEvent);
    }
    buffer += decoder.decode().replace(/\r/g, '');
    consumeSseBuffer(buffer, onEvent);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
