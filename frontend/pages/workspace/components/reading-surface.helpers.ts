import type { TextAnchor } from '@/features/anchors';
import type { DocumentParagraph } from '@/features/reading/reading-core';

export interface ParagraphSegment {
  text: string;
  startOffset: number;
  anchorIds: string[];
}

interface ClippedAnchor {
  anchorId: string;
  start: number;
  end: number;
}

/**
 * Only selected passages are marked inside the text. A paragraph- or
 * document-scoped anchor covers everything a reader is looking at, so drawing it
 * inline would underline the whole page instead of pointing at anything.
 */
function isInlineMarkable(anchor: TextAnchor): boolean {
  return anchor.scope === 'selection';
}

function clipToParagraph(
  anchor: TextAnchor,
  paragraph: DocumentParagraph,
): ClippedAnchor | null {
  const start = Math.max(anchor.startOffset, paragraph.startOffset);
  const end = Math.min(anchor.endOffset, paragraph.endOffset);
  if (start >= end) {
    return null;
  }

  return {
    anchorId: anchor.id,
    start: start - paragraph.startOffset,
    end: end - paragraph.startOffset,
  };
}

/**
 * Splits a paragraph into runs of text that share the same set of anchors, so
 * saved passages keep a visible mark in the source instead of only existing in
 * the context panel. Overlapping anchors produce a run that belongs to several.
 */
export function buildParagraphSegments(
  paragraph: DocumentParagraph,
  anchors: TextAnchor[],
): ParagraphSegment[] {
  const clipped = anchors
    .filter(isInlineMarkable)
    .flatMap((anchor) => {
      const range = clipToParagraph(anchor, paragraph);
      return range ? [range] : [];
    });

  if (clipped.length === 0) {
    return [{ text: paragraph.text, startOffset: 0, anchorIds: [] }];
  }

  const boundaries = [...new Set([
    0,
    paragraph.text.length,
    ...clipped.flatMap(({ start, end }) => [start, end]),
  ])]
    .filter((boundary) => boundary >= 0 && boundary <= paragraph.text.length)
    .sort((left, right) => left - right);

  const segments: ParagraphSegment[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const text = paragraph.text.slice(start, end);
    if (!text) {
      continue;
    }

    segments.push({
      text,
      startOffset: start,
      anchorIds: clipped
        .filter((range) => range.start <= start && range.end >= end)
        .map((range) => range.anchorId),
    });
  }

  return segments;
}

/**
 * Close Read sources are marked at paragraph level rather than inline, so the
 * reader can still see which paragraphs already have saved reading work.
 */
export function getParagraphScopedAnchors(
  paragraph: DocumentParagraph,
  anchors: TextAnchor[],
): TextAnchor[] {
  return anchors.filter((anchor) => (
    anchor.scope === 'paragraph'
    && anchor.startOffset < paragraph.endOffset
    && anchor.endOffset > paragraph.startOffset
  ));
}
