import { describe, expect, it } from 'vitest';
import {
  createAnchorFromSelection,
  getActiveAnchorIdForDocument,
  normalizeAnchorQuote,
  setActiveAnchorForDocument,
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

  it('uses the provided offsets for a repeated selected passage', () => {
    const anchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Repeat this. Repeat this.',
      selectedText: 'Repeat this',
      startOffset: 13,
      endOffset: 24,
    });

    expect(anchor).toMatchObject({ startOffset: 13, endOffset: 24 });
  });

  it('does not guess an anchor for an ambiguous passage without offsets', () => {
    const anchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Repeat this. Repeat this.',
      selectedText: 'Repeat this',
    });

    expect(anchor).toBeNull();
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

  it('remembers a different active anchor for each document', () => {
    const firstAnchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Alpha beta.',
      selectedText: 'Alpha',
    });
    const secondAnchor = createAnchorFromSelection({
      documentId: 'document-2',
      documentText: 'Gamma delta.',
      selectedText: 'Gamma',
    });
    expect(firstAnchor).not.toBeNull();
    expect(secondAnchor).not.toBeNull();
    if (!firstAnchor || !secondAnchor) {
      return;
    }

    const storage = setActiveAnchorForDocument(
      setActiveAnchorForDocument({
        anchorsById: {
          [firstAnchor.id]: firstAnchor,
          [secondAnchor.id]: secondAnchor,
        },
        activeAnchorId: null,
      }, 'document-1', firstAnchor.id),
      'document-2',
      secondAnchor.id,
    );

    expect(getActiveAnchorIdForDocument(storage, 'document-1')).toBe(firstAnchor.id);
    expect(getActiveAnchorIdForDocument(storage, 'document-2')).toBe(secondAnchor.id);
  });

  it('keeps identical passages distinct across reading sessions', () => {
    const firstAnchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'The same passage.',
      selectedText: 'same',
    });
    const secondAnchor = createAnchorFromSelection({
      documentId: 'document-2',
      documentText: 'The same passage.',
      selectedText: 'same',
    });

    expect(firstAnchor?.id).not.toBe(secondAnchor?.id);
  });

  it('preserves a legacy active anchor when another document becomes active', () => {
    const firstAnchor = createAnchorFromSelection({
      documentId: 'document-1',
      documentText: 'Alpha beta.',
      selectedText: 'Alpha',
    });
    const secondAnchor = createAnchorFromSelection({
      documentId: 'document-2',
      documentText: 'Gamma delta.',
      selectedText: 'Gamma',
    });
    expect(firstAnchor).not.toBeNull();
    expect(secondAnchor).not.toBeNull();
    if (!firstAnchor || !secondAnchor) return;

    const storage = setActiveAnchorForDocument({
      anchorsById: {
        [firstAnchor.id]: firstAnchor,
        [secondAnchor.id]: secondAnchor,
      },
      activeAnchorId: firstAnchor.id,
    }, 'document-2', secondAnchor.id);

    expect(getActiveAnchorIdForDocument(storage, 'document-1')).toBe(firstAnchor.id);
    expect(getActiveAnchorIdForDocument(storage, 'document-2')).toBe(secondAnchor.id);
  });
});
