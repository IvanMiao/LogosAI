import { describe, expect, it } from 'vitest';
import {
  createAnchorFromSelection,
  normalizeAnchorQuote,
  resolveAnchor,
} from '@/features/anchors';

describe('anchor core', () => {
  it('normalizes quote whitespace and unicode width', () => {
    expect(normalizeAnchorQuote('  Une\u00a0phrase\n\ntrès   dense  ')).toBe('Une phrase très dense');
    expect(normalizeAnchorQuote('ＡＢＣ')).toBe('ABC');
  });

  it('creates an anchor with offsets and a quote hash', () => {
    const anchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Alpha beta gamma.',
      selectedText: 'beta',
    });

    expect(anchor).toMatchObject({
      documentId: 'document-1',
      quote: 'beta',
      normalizedQuote: 'beta',
      startOffset: 6,
      endOffset: 10,
      scope: 'selection',
    });
    expect(anchor?.quoteHash).toBeTruthy();
  });

  it('resolves an anchor when the document text is unchanged', () => {
    const anchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Alpha beta gamma.',
      selectedText: 'beta',
    });

    expect(anchor ? resolveAnchor(anchor, 'Alpha beta gamma.') : null).toEqual({
      startOffset: 6,
      endOffset: 10,
      quote: 'beta',
    });
  });

  it('returns null when an anchor cannot be resolved', () => {
    const anchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Alpha beta gamma.',
      selectedText: 'beta',
    });

    expect(anchor ? resolveAnchor(anchor, 'Alpha delta gamma.') : null).toBeNull();
  });
});
