import { describe, expect, it } from 'vitest';
import type { TextAnchor } from '@/features/anchors';
import type { DocumentParagraph } from '@/features/reading/reading-core';
import {
  buildParagraphSegments,
  getParagraphScopedAnchors,
} from '@/pages/workspace/components/reading-surface.helpers';

// The paragraph starts at offset 10 in its document so the tests also cover the
// conversion from document offsets to paragraph-relative ones.
const paragraph: DocumentParagraph = {
  text: 'Alpha beta gamma delta.',
  startOffset: 10,
  endOffset: 33,
};

function createAnchor(overrides: Partial<TextAnchor> & { id: string }): TextAnchor {
  return {
    documentId: 'document-1',
    quote: 'quote',
    normalizedQuote: 'quote',
    quoteHash: 'hash',
    scope: 'selection',
    startOffset: 0,
    endOffset: 0,
    createdAt: '2026-08-21T10:00:00.000Z',
    ...overrides,
  } as TextAnchor;
}

describe('buildParagraphSegments', () => {
  it('returns the whole paragraph as one unmarked run when nothing is saved', () => {
    expect(buildParagraphSegments(paragraph, [])).toEqual([
      { text: 'Alpha beta gamma delta.', startOffset: 0, anchorIds: [] },
    ]);
  });

  it('splits a saved passage out of the surrounding text', () => {
    const anchor = createAnchor({ id: 'anchor-1', startOffset: 16, endOffset: 20 });

    expect(buildParagraphSegments(paragraph, [anchor])).toEqual([
      { text: 'Alpha ', startOffset: 0, anchorIds: [] },
      { text: 'beta', startOffset: 6, anchorIds: ['anchor-1'] },
      { text: ' gamma delta.', startOffset: 10, anchorIds: [] },
    ]);
  });

  it('marks a passage that starts before the paragraph without spilling past it', () => {
    const anchor = createAnchor({ id: 'spanning', startOffset: 4, endOffset: 16 });

    expect(buildParagraphSegments(paragraph, [anchor])).toEqual([
      { text: 'Alpha ', startOffset: 0, anchorIds: ['spanning'] },
      { text: 'beta gamma delta.', startOffset: 6, anchorIds: [] },
    ]);
  });

  it('reports every anchor covering an overlapping run', () => {
    const outer = createAnchor({ id: 'outer', startOffset: 10, endOffset: 26 });
    const inner = createAnchor({ id: 'inner', startOffset: 16, endOffset: 21 });

    expect(buildParagraphSegments(paragraph, [outer, inner])).toEqual([
      { text: 'Alpha ', startOffset: 0, anchorIds: ['outer'] },
      { text: 'beta ', startOffset: 6, anchorIds: ['outer', 'inner'] },
      { text: 'gamma', startOffset: 11, anchorIds: ['outer'] },
      { text: ' delta.', startOffset: 16, anchorIds: [] },
    ]);
  });

  it('never loses or duplicates paragraph text', () => {
    const anchors = [
      createAnchor({ id: 'a', startOffset: 10, endOffset: 15 }),
      createAnchor({ id: 'b', startOffset: 21, endOffset: 27 }),
      createAnchor({ id: 'c', startOffset: 26, endOffset: 33 }),
    ];

    const segments = buildParagraphSegments(paragraph, anchors);
    expect(segments.map((segment) => segment.text).join('')).toBe(paragraph.text);
  });

  it('ignores paragraph and document scopes so a whole page is never underlined', () => {
    const paragraphAnchor = createAnchor({
      id: 'paragraph-anchor',
      scope: 'paragraph',
      startOffset: 10,
      endOffset: 33,
    });
    const documentAnchor = createAnchor({
      id: 'document-anchor',
      scope: 'document',
      startOffset: 0,
      endOffset: 400,
    });

    expect(buildParagraphSegments(paragraph, [paragraphAnchor, documentAnchor])).toEqual([
      { text: 'Alpha beta gamma delta.', startOffset: 0, anchorIds: [] },
    ]);
  });

  it('drops a passage that does not touch the paragraph', () => {
    const anchor = createAnchor({ id: 'elsewhere', startOffset: 40, endOffset: 48 });

    expect(buildParagraphSegments(paragraph, [anchor])).toEqual([
      { text: 'Alpha beta gamma delta.', startOffset: 0, anchorIds: [] },
    ]);
  });
});

describe('getParagraphScopedAnchors', () => {
  it('keeps only paragraph-scoped anchors that overlap the paragraph', () => {
    const overlapping = createAnchor({
      id: 'overlapping',
      scope: 'paragraph',
      startOffset: 10,
      endOffset: 33,
    });
    const elsewhere = createAnchor({
      id: 'elsewhere',
      scope: 'paragraph',
      startOffset: 40,
      endOffset: 60,
    });
    const selection = createAnchor({ id: 'selection', startOffset: 12, endOffset: 16 });

    expect(getParagraphScopedAnchors(paragraph, [overlapping, elsewhere, selection]))
      .toEqual([overlapping]);
  });
});
