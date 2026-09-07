import {
  captureReadingPosition, parseReadingPosition, restoreReadingFocus, restoreReadingPosition,
} from './reading-scroll-position';
import type { ReadingViewStore } from './reading-view-storage';

export function connectReadingScroll(
  pane: HTMLElement, store: ReadingViewStore, documentId: string, key: string,
): () => void {
  const saved = parseReadingPosition(store.read(documentId)[key]);
  let restoring = saved !== null;
  let position = saved ?? captureReadingPosition(pane);
  let timer: number | undefined;
  const save = () => {
    window.clearTimeout(timer);
    if (!restoring) store.write(documentId, key, captureReadingPosition(pane));
  };
  const restore = () => {
    if (restoring && saved) restoreReadingPosition(pane, saved);
  };
  const stopRestoring = () => { restoring = false; };
  const onScroll = () => {
    if (!restoring) position = captureReadingPosition(pane);
    window.clearTimeout(timer);
    timer = window.setTimeout(save, 180);
  };
  restore();
  restoreReadingFocus(pane, saved?.focus ?? null);
  const frame = window.requestAnimationFrame(restore);
  void document.fonts?.ready.then(restore);
  const onResize = () => restoreReadingPosition(pane, restoring && saved ? saved : position);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
  observer?.observe(pane);
  if (pane.lastElementChild) observer?.observe(pane.lastElementChild);
  const settle = window.setTimeout(stopRestoring, 1500);
  const interactionEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'reading-reveal'];
  interactionEvents.forEach((event) => pane.addEventListener(event, stopRestoring, { passive: true }));
  pane.addEventListener('scroll', onScroll);
  window.addEventListener('pagehide', save);
  return () => {
    save();
    restoring = false;
    observer?.disconnect();
    window.clearTimeout(settle);
    window.cancelAnimationFrame(frame);
    interactionEvents.forEach((event) => pane.removeEventListener(event, stopRestoring));
    pane.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', save);
  };
}
