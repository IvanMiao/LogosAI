import { beforeEach, describe, expect, it } from 'vitest';
import { getSelectionOffsets } from '@/features/anchors';

interface TestParagraph {
  element: HTMLParagraphElement;
  textNode: Text;
}

function appendParagraph(text: string, startOffset: number): TestParagraph {
  const element = document.createElement('p');
  const textNode = document.createTextNode(text);
  element.dataset.paragraphStart = String(startOffset);
  element.append(textNode);
  document.body.append(element);
  return { element, textNode };
}

function createRange(
  start: Text,
  startOffset: number,
  end: Text,
  endOffset: number,
): Range {
  const range = document.createRange();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  return range;
}

describe('selection offsets', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('calculates offsets within one paragraph', () => {
    const paragraph = appendParagraph('Alpha beta gamma', 20);
    const range = createRange(paragraph.textNode, 6, paragraph.textNode, 10);

    expect(getSelectionOffsets(range)).toEqual({
      startOffset: 26,
      endOffset: 30,
    });
  });

  it('calculates offsets across paragraphs', () => {
    const first = appendParagraph('Alpha', 0);
    const second = appendParagraph('Beta', 7);
    const range = createRange(first.textNode, 2, second.textNode, 2);

    expect(getSelectionOffsets(range)).toEqual({
      startOffset: 2,
      endOffset: 9,
    });
  });

  it('uses JavaScript string offsets for Unicode text', () => {
    const paragraph = appendParagraph('A😀é中Z', 10);
    const range = createRange(paragraph.textNode, 3, paragraph.textNode, 5);

    expect(range.toString()).toBe('é中');
    expect(getSelectionOffsets(range)).toEqual({
      startOffset: 13,
      endOffset: 15,
    });
  });

  it('rejects an empty selection', () => {
    const paragraph = appendParagraph('Alpha', 0);
    const range = createRange(paragraph.textNode, 2, paragraph.textNode, 2);

    expect(getSelectionOffsets(range)).toBeNull();
  });

  it('preserves the position of the second repeated quote', () => {
    const paragraph = appendParagraph('repeat and repeat', 0);
    const range = createRange(paragraph.textNode, 11, paragraph.textNode, 17);

    expect(range.toString()).toBe('repeat');
    expect(getSelectionOffsets(range)).toEqual({
      startOffset: 11,
      endOffset: 17,
    });
  });
});
