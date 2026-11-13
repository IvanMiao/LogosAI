export type CloseReadingBlockKind = 'overview' | 'paragraph' | 'synthesis' | 'untagged';

export interface CloseReadingBlock {
  kind: CloseReadingBlockKind;
  /** 1-based position of the source paragraph; only set for `paragraph` blocks. */
  paragraphNumber?: number;
  content: string;
}

// Mirrors backend/llm/close_reading.py: a tag at the start of a line, also when
// wrapped in backticks or asterisks, missing a closing bracket, or followed by
// commentary. Streaming text reaches the reader before the server normalizes it.
const MARKER_LINE = /^[ \t]*[`*]{0,2}\[\[(OVERVIEW|SYNTHESIS|P\d+)\]{1,2}[`*]{0,2}[ \t]*(.*)$/gm;

function createBlock(tag: string, content: string): CloseReadingBlock {
  if (tag === 'OVERVIEW') return { kind: 'overview', content };
  if (tag === 'SYNTHESIS') return { kind: 'synthesis', content };
  return { kind: 'paragraph', paragraphNumber: Number(tag.slice(1)), content };
}

/**
 * Splits a paragraph-aligned Close Reading into its tagged blocks.
 * Returns null for readings without tags, which are rendered as one document.
 */
export function parseCloseReadingBlocks(content: string): CloseReadingBlock[] | null {
  const markers = [...content.matchAll(MARKER_LINE)];
  if (markers.length === 0) return null;

  const blocks: CloseReadingBlock[] = [];
  const preamble = content.slice(0, markers[0].index).trim();
  if (preamble) blocks.push({ kind: 'untagged', content: preamble });

  markers.forEach((marker, position) => {
    const bodyStart = marker.index + marker[0].length;
    const bodyEnd = markers[position + 1]?.index ?? content.length;
    const body = `${marker[2]}\n${content.slice(bodyStart, bodyEnd)}`.trim();
    blocks.push(createBlock(marker[1], body));
  });
  return blocks;
}
