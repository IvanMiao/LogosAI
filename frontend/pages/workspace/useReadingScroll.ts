import { useContext, useLayoutEffect, useRef } from 'react';
import { ReadingSessionContext, ReadingViewContext } from './reading-view-context';
import { connectReadingScroll } from './reading-scroll-session';

export function useReadingScroll(paneKey: string) {
  const paneRef = useRef<HTMLElement | null>(null);
  const store = useContext(ReadingViewContext)?.store;
  const documentId = useContext(ReadingSessionContext);
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pane || !store) return;
    return connectReadingScroll(pane, store, documentId, `scroll:${paneKey}`);
  }, [documentId, paneKey, store]);
  return paneRef;
}
