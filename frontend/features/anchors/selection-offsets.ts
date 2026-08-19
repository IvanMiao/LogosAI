export interface SelectionOffsets {
  startOffset: number;
  endOffset: number;
}

function getParagraphElement(node: Node): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>('[data-paragraph-start]') ?? null;
}

function getOffsetWithinParagraph(
  paragraph: HTMLElement,
  container: Node,
  offset: number,
): number | null {
  const paragraphStart = Number(paragraph.dataset.paragraphStart);
  if (!Number.isInteger(paragraphStart)) {
    return null;
  }

  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(paragraph);
  prefixRange.setEnd(container, offset);
  return paragraphStart + prefixRange.toString().length;
}

export function getSelectionOffsets(range: Range): SelectionOffsets | null {
  const startParagraph = getParagraphElement(range.startContainer);
  const endParagraph = getParagraphElement(range.endContainer);
  if (!startParagraph || !endParagraph) {
    return null;
  }

  const startOffset = getOffsetWithinParagraph(
    startParagraph,
    range.startContainer,
    range.startOffset,
  );
  const endOffset = getOffsetWithinParagraph(
    endParagraph,
    range.endContainer,
    range.endOffset,
  );
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    return null;
  }

  return { startOffset, endOffset };
}
