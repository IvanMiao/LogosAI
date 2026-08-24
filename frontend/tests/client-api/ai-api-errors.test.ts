import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamAnalysis } from '@/client-api/analysis-api';
import { runAnchorSkill } from '@/client-api/anchor-api';

function createWorkerErrorResponse(message: string): Response {
  return new Response(JSON.stringify({
    code: 'AUTH_REQUIRED',
    message,
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AI API gateway errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces Worker error messages for legacy analysis requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createWorkerErrorResponse('Sign in to analyze this text.'),
    ));

    await expect(streamAnalysis({
      model: 'gemini-2.5-flash',
      text: 'Source text',
      userLanguage: 'en',
    }, {
      onChunk: vi.fn(),
      onStage: vi.fn(),
    })).rejects.toThrow('Sign in to analyze this text.');
  });

  it('surfaces Worker error messages for anchored requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createWorkerErrorResponse('Your session expired. Sign in again.'),
    ));

    await expect(runAnchorSkill({
      model: 'gemini-2.5-flash',
      document: {
        id: 'document-1',
        title: 'Source',
        text: 'Source text',
        sourceType: 'paste',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
      anchor: {
        id: 'anchor-1',
        documentId: 'document-1',
        scope: 'selection',
        quote: 'Source',
        normalizedQuote: 'source',
        quoteHash: 'hash',
        startOffset: 0,
        endOffset: 6,
        createdAt: '2026-08-14T00:00:00.000Z',
      },
      skill: 'explain',
      userLanguage: 'en',
    }, {
      onChunk: vi.fn(),
      onStage: vi.fn(),
      onMetadata: vi.fn(),
    })).rejects.toThrow('Your session expired. Sign in again.');
  });
});
