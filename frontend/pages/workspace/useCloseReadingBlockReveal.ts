import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ParagraphReveal } from './useWorkspaceViewState';

const HIGHLIGHT_DURATION_MS = 1800;

/**
 * Scrolls a Close Reading pane to the block of a source paragraph and returns
 * the paragraph number to highlight while the jump is fresh.
 */
export function useCloseReadingBlockReveal(
  paneRef: RefObject<HTMLElement | null>,
  reveal: ParagraphReveal | null,
  onHandled: () => void,
  isStreaming: boolean,
): number | null {
  const [revealed, setRevealed] = useState<ParagraphReveal | null>(null);
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (!reveal) return;
    // Take the request into local state and clear it upstream, so a later
    // remount of the pane does not replay an old jump.
    setRevealed(reveal);
    onHandled();
  }, [onHandled, reveal]);

  useEffect(() => {
    if (!revealed) return undefined;

    const pane = paneRef.current;
    pane?.dispatchEvent(new Event('reading-reveal'));
    const scrollTimer = window.setTimeout(() => {
      // While the reading streams, the pane re-pins its scroll position on every
      // chunk, which would cancel a smooth scroll before it gets anywhere.
      const jumpInstantly = isStreamingRef.current || (window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches ?? false);
      pane?.querySelector<HTMLElement>(
        `[data-close-reading-block="paragraph"][data-paragraph-number="${revealed.paragraphNumber}"]`,
      )?.scrollIntoView?.({
        behavior: jumpInstantly ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 0);
    const highlightTimer = window.setTimeout(() => {
      setRevealed((current) => (current === revealed ? null : current));
    }, HIGHLIGHT_DURATION_MS);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [paneRef, revealed]);

  return revealed?.paragraphNumber ?? null;
}
