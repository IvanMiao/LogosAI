import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAnchorSkill, type RunAnchorExplainRequest } from '@/client-api/anchor-api';
import { streamAnalysis } from '@/client-api/analysis-api';

const request: RunAnchorExplainRequest = {
  model: 'gemini-2.5-flash', userLanguage: 'en',
  document: {
    id: 'document-1', title: 'Source', text: 'Source text', sourceType: 'paste',
    createdAt: '2026-09-06', updatedAt: '2026-09-06',
  },
  anchor: {
    id: 'anchor-1', documentId: 'document-1', scope: 'selection', quote: 'Source',
    normalizedQuote: 'source', quoteHash: 'hash', startOffset: 0, endOffset: 6,
    createdAt: '2026-09-06',
  },
};
const identity = { request_id: 'request-1', trace_id: 'trace-1', anchor_id: 'anchor-1' };

function event(name: string, payload: Record<string, unknown> = {}): string {
  return `event: ${name}\r\ndata: ${JSON.stringify({ ...identity, ...payload })}\r\n\r\n`;
}

function respondWith(text: string): void {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Exercise split UTF-8 characters and SSE boundaries.
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
}

function callbacks() {
  return { onChunk: vi.fn(), onStage: vi.fn(), onMetadata: vi.fn() };
}

afterEach(() => vi.unstubAllGlobals());

describe('anchored stream completion', () => {
  it('preserves UTF-8 chunks and completes with matching done metadata', async () => {
    respondWith(': heartbeat\r\n\r\n' + event('stage', { stage: 'interpret' })
      + event('chunk', { delta: '你好' }) + event('done', { result: '你好' }));
    const handlers = callbacks();
    await expect(runAnchorSkill(request, handlers)).resolves.toEqual({
      requestId: 'request-1', traceId: 'trace-1', anchorId: 'anchor-1', result: '你好',
    });
    expect(handlers.onChunk).toHaveBeenCalledWith('你好', expect.any(Object));
    expect(handlers.onStage).toHaveBeenCalledWith('interpret', expect.any(Object));
  });

  it.each(['', event('stage', { stage: 'interpret' }), event('chunk', { delta: 'Partial' })])(
    'rejects EOF without done (%s)', async (stream) => {
      respondWith(stream);
      await expect(runAnchorSkill(request, callbacks())).rejects.toThrow('before completion');
    },
  );

  it.each([
    { request_id: 'different' }, { trace_id: 'different' }, { anchor_id: 'different' },
    { request_id: '' }, { trace_id: null },
  ])('rejects mismatched or missing identity %j', async (override) => {
    respondWith(event('chunk', { delta: 'Partial' }) + event('done', { result: 'Final', ...override }));
    await expect(runAnchorSkill(request, callbacks())).rejects.toThrow(/identity/);
  });

  it('rejects a wrong anchor on the first event', async () => {
    respondWith(event('done', { result: 'Final', anchor_id: 'different' }));
    await expect(runAnchorSkill(request, callbacks())).rejects.toThrow(/identity/);
  });

  it('does not complete after a server error', async () => {
    respondWith(event('error', { message: 'Model failed' }) + event('done', { result: 'Final' }));
    await expect(runAnchorSkill(request, callbacks())).rejects.toThrow('Model failed');
  });

  it('rejects empty final output', async () => {
    respondWith(event('done', { result: ' ' }));
    await expect(runAnchorSkill(request, callbacks())).rejects.toThrow('without a result');
  });
});

describe('legacy stream transport', () => {
  it('still decodes chunks and returns the final result', async () => {
    respondWith(event('chunk', { delta: '你好' }) + event('done', { result: '你好' }));
    const handlers = callbacks();
    await expect(streamAnalysis({ model: request.model, text: 'Source', userLanguage: 'en' }, handlers))
      .resolves.toBe('你好');
    expect(handlers.onChunk).toHaveBeenCalledWith('你好');
  });

  it('still rejects a stream truncated before done', async () => {
    respondWith(event('chunk', { delta: 'Partial' }));
    await expect(streamAnalysis({ model: request.model, text: 'Source', userLanguage: 'en' }, callbacks()))
      .rejects.toThrow('before completion');
  });
});
