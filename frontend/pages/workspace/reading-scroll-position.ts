import { isRecord } from './reading-view-storage';

export interface ReadingScrollPosition {
  scrollTop: number;
  blockIndex: number;
  signature: string;
  fraction: number;
  gap: number;
  focus: string | null;
}

const BLOCKS = '[data-reading-block], [data-reading-content] :is(p,h1,h2,h3,h4,li,pre,blockquote)';

function signature(element: Element): string {
  const content = element.textContent ?? '';
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  }
  return `${content.length}:${hash >>> 0}`;
}

function viewportTop(pane: HTMLElement): number {
  const header = pane.querySelector<HTMLElement>('[data-reading-sticky]');
  return pane.getBoundingClientRect().top + (header?.getBoundingClientRect().height ?? 0);
}

export function captureReadingPosition(pane: HTMLElement): ReadingScrollPosition {
  const blocks = [...pane.querySelectorAll<HTMLElement>(BLOCKS)];
  const top = viewportTop(pane);
  const blockIndex = blocks.findIndex((block) => block.getBoundingClientRect().bottom > top);
  const block = blocks[blockIndex];
  const rect = block?.getBoundingClientRect();
  const focus = pane.contains(document.activeElement)
    ? document.activeElement?.getAttribute('data-reading-focus') ?? null
    : null;
  return {
    scrollTop: pane.scrollTop,
    blockIndex,
    signature: block ? signature(block) : '',
    fraction: rect && rect.height > 0 ? Math.max(0, (top - rect.top) / rect.height) : 0,
    gap: rect ? Math.max(0, rect.top - top) : 0,
    focus,
  };
}

function resolveBlock(pane: HTMLElement, position: ReadingScrollPosition): HTMLElement | undefined {
  const blocks = [...pane.querySelectorAll<HTMLElement>(BLOCKS)];
  const original = blocks[position.blockIndex];
  if (original && signature(original) === position.signature) return original;
  const matches = blocks.filter((block) => signature(block) === position.signature);
  return matches.length === 1 ? matches[0] : undefined;
}

export function restoreReadingPosition(pane: HTMLElement, position: ReadingScrollPosition): void {
  if (position.scrollTop === 0) {
    pane.scrollTop = 0;
    return;
  }
  const block = resolveBlock(pane, position);
  if (!block) {
    // A changed or ambiguous block must not silently bind to another passage.
    pane.scrollTop = position.signature ? 0 : position.scrollTop;
    return;
  }
  const rect = block.getBoundingClientRect();
  pane.scrollTop += rect.top - viewportTop(pane) + rect.height * position.fraction - position.gap;
}

export function parseReadingPosition(value: unknown): ReadingScrollPosition | null {
  if (!isRecord(value)) return null;
  const numbers = ['scrollTop', 'blockIndex', 'fraction', 'gap'] as const;
  if (!numbers.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) return null;
  if (typeof value.signature !== 'string' || value.signature.length > 80) return null;
  if (!validFocus(value.focus)) return null;
  const position = value as unknown as ReadingScrollPosition;
  return validPosition(position) ? position : null;
}

export function restoreReadingFocus(pane: HTMLElement, focus: string | null): void {
  if (!focus || document.activeElement !== document.body) return;
  const target = [...pane.querySelectorAll<HTMLElement>('[data-reading-focus]')]
    .find((element) => element.dataset.readingFocus === focus);
  target?.focus({ preventScroll: true });
}

function validFocus(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function validPosition(position: ReadingScrollPosition): boolean {
  return position.scrollTop >= 0 && position.fraction >= 0 && position.fraction <= 1
    && position.gap >= 0 && Number.isInteger(position.blockIndex);
}
