import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { captureReadingPosition, parseReadingPosition, restoreReadingPosition } from '@/pages/workspace/reading-scroll-position';
import { connectReadingScroll } from '@/pages/workspace/reading-scroll-session';
import { createReadingViewStore, readingViewKey } from '@/pages/workspace/reading-view-storage';

function createPane() {
  const pane = document.createElement('section');
  pane.innerHTML = '<p data-reading-block>First passage</p><p data-reading-block>Second passage</p>';
  const blocks = [...pane.querySelectorAll('p')];
  let blockHeight = 200;
  pane.getBoundingClientRect = () => ({ top: 0, bottom: 300, height: 300 } as DOMRect);
  blocks.forEach((block, index) => {
    block.getBoundingClientRect = () => ({
      top: index * blockHeight - pane.scrollTop,
      bottom: (index + 1) * blockHeight - pane.scrollTop, height: blockHeight,
    } as DOMRect);
  });
  document.body.append(pane);
  return { pane, blocks, resize: (height: number) => { blockHeight = height; } };
}

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('semantic reading position', () => {
  it('restores the same passage and relative position after typography changes', () => {
    const { pane, resize } = createPane();
    pane.scrollTop = 250;
    const saved = captureReadingPosition(pane);
    expect(saved.blockIndex).toBe(1);
    expect(saved.fraction).toBe(0.25);
    resize(320);
    pane.scrollTop = 0;
    restoreReadingPosition(pane, saved);
    expect(pane.scrollTop).toBe(400);
  });

  it('does not guess when a saved block is changed or becomes ambiguous', () => {
    const { pane, blocks } = createPane();
    pane.scrollTop = 250;
    const saved = captureReadingPosition(pane);
    blocks[1].textContent = 'Replaced content';
    restoreReadingPosition(pane, saved);
    expect(pane.scrollTop).toBe(0);
    blocks[0].textContent = 'Second passage';
    pane.append(blocks[0].cloneNode(true));
    restoreReadingPosition(pane, saved);
    expect(pane.scrollTop).toBe(0);
  });

  it('rejects malformed and out-of-range snapshots', () => {
    expect(parseReadingPosition(null)).toBeNull();
    const { pane } = createPane();
    const saved = captureReadingPosition(pane);
    expect(parseReadingPosition({ ...saved, scrollTop: Infinity })).toBeNull();
    expect(parseReadingPosition({ ...saved, fraction: 10 })).toBeNull();
    expect(parseReadingPosition({ ...saved, blockIndex: 0.5 })).toBeNull();
  });

  it('cancels delayed font restoration after user interaction and saves before unmount', async () => {
    vi.useFakeTimers();
    const { pane } = createPane();
    const store = createReadingViewStore('reader', vi.fn());
    pane.scrollTop = 250;
    store.write('doc', 'scroll:source', captureReadingPosition(pane));
    pane.scrollTop = 0;
    const disconnect = connectReadingScroll(pane, store, 'doc', 'scroll:source');
    expect(pane.scrollTop).toBe(250);
    pane.dispatchEvent(new Event('wheel'));
    pane.scrollTop = 80;
    pane.dispatchEvent(new Event('scroll'));
    await vi.advanceTimersByTimeAsync(20);
    expect(pane.scrollTop).toBe(80);
    disconnect();
    const persisted = JSON.parse(localStorage.getItem(readingViewKey('reader', 'doc'))!);
    expect(persisted.values['scroll:source'].scrollTop).toBe(80);
  });

  it('keeps the current passage on a live resize after initial restoration has settled', async () => {
    vi.useFakeTimers();
    let resizeCallback: ResizeObserverCallback = () => undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
      observe() {}
      disconnect() {}
    });
    const { pane, resize } = createPane();
    const store = createReadingViewStore('reader', vi.fn());
    const disconnect = connectReadingScroll(pane, store, 'doc', 'scroll:source');
    await vi.advanceTimersByTimeAsync(1600);
    pane.scrollTop = 250;
    pane.dispatchEvent(new Event('scroll'));
    resize(320);
    resizeCallback([], {} as ResizeObserver);
    expect(pane.scrollTop).toBe(400);
    disconnect();
  });

  it('isolates accounts and retains in-memory state when persistent writes fail', () => {
    const onError = vi.fn();
    const first = createReadingViewStore('first', onError);
    first.write('doc', 'view', { readerLayout: 'analysis' });
    const other = createReadingViewStore('other', vi.fn());
    expect(other.read('doc').view).toBeUndefined();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    first.write('doc', 'view', { readerLayout: 'source' });
    expect(first.read('doc').view).toEqual({ readerLayout: 'source' });
    expect(onError).toHaveBeenLastCalledWith(true);
  });
});
