import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  DEFAULT_CLOSE_READING_SOURCE_WIDTH,
  MAX_CLOSE_READING_SOURCE_WIDTH,
  MIN_CLOSE_READING_SOURCE_WIDTH,
  readStoredCloseReadingSourceWidth,
  writeStoredCloseReadingSourceWidth,
} from '@/features/reading/reading-storage';

type CloseReadingGridStyle = CSSProperties & {
  '--reader-source-width': string;
};

interface CloseReadingResizeController {
  sourceWidth: number;
  gridStyle: CloseReadingGridStyle;
  containerRef: RefObject<HTMLDivElement | null>;
  separatorRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  resetSourceWidth: () => void;
}

function normalizeSourceWidth(sourceWidth: number): number {
  const clampedWidth = Math.min(
    MAX_CLOSE_READING_SOURCE_WIDTH,
    Math.max(MIN_CLOSE_READING_SOURCE_WIDTH, sourceWidth),
  );
  return Math.round(clampedWidth * 10) / 10;
}

function getPointerSourceWidth(container: HTMLElement, clientX: number): number {
  const bounds = container.getBoundingClientRect();
  if (bounds.width === 0) {
    return DEFAULT_CLOSE_READING_SOURCE_WIDTH;
  }

  return normalizeSourceWidth(((clientX - bounds.left) / bounds.width) * 100);
}

function getKeyboardSourceWidth(event: KeyboardEvent, currentWidth: number): number | null {
  const step = event.shiftKey ? 8 : 2;
  if (event.key === 'ArrowLeft') return currentWidth - step;
  if (event.key === 'ArrowRight') return currentWidth + step;
  if (event.key === 'Home') return MIN_CLOSE_READING_SOURCE_WIDTH;
  if (event.key === 'End') return MAX_CLOSE_READING_SOURCE_WIDTH;
  return null;
}

function getRatioLabel(sourceWidth: number): string {
  return `Source ${Math.round(sourceWidth)}%, analysis ${Math.round(100 - sourceWidth)}%`;
}

export function useCloseReadingResize(storageScope: string): CloseReadingResizeController {
  const [sourceWidth, setSourceWidth] = useState(
    () => readStoredCloseReadingSourceWidth(storageScope),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const separatorRef = useRef<HTMLDivElement | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const transientSourceWidthRef = useRef(sourceWidth);

  useEffect(() => {
    const storedWidth = readStoredCloseReadingSourceWidth(storageScope);
    transientSourceWidthRef.current = storedWidth;
    setSourceWidth(storedWidth);
    containerRef.current?.style.setProperty('--reader-source-width', `${storedWidth}%`);
    separatorRef.current?.setAttribute('aria-valuenow', String(Math.round(storedWidth)));
    separatorRef.current?.setAttribute('aria-valuetext', getRatioLabel(storedWidth));
  }, [storageScope]);

  const applyTransientWidth = (nextWidth: number) => {
    const normalizedWidth = normalizeSourceWidth(nextWidth);
    transientSourceWidthRef.current = normalizedWidth;
    containerRef.current?.style.setProperty(
      '--reader-source-width',
      `${normalizedWidth}%`,
    );
    separatorRef.current?.setAttribute('aria-valuenow', String(Math.round(normalizedWidth)));
    separatorRef.current?.setAttribute('aria-valuetext', getRatioLabel(normalizedWidth));
  };

  const commitWidth = (nextWidth: number) => {
    const normalizedWidth = normalizeSourceWidth(nextWidth);
    transientSourceWidthRef.current = normalizedWidth;
    setSourceWidth(normalizedWidth);
    writeStoredCloseReadingSourceWidth(normalizedWidth, storageScope);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragPointerIdRef.current = event.pointerId;
    containerRef.current?.classList.add('select-none');
    event.currentTarget.dataset.dragging = 'true';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId || !containerRef.current) return;
    applyTransientWidth(getPointerSourceWidth(containerRef.current, event.clientX));
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    containerRef.current?.classList.remove('select-none');
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    commitWidth(transientSourceWidthRef.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextWidth = getKeyboardSourceWidth(event, transientSourceWidthRef.current);
    if (nextWidth === null) return;
    event.preventDefault();
    commitWidth(nextWidth);
  };

  return {
    sourceWidth,
    gridStyle: { '--reader-source-width': `${sourceWidth}%` },
    containerRef,
    separatorRef,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onKeyDown,
    resetSourceWidth: () => commitWidth(DEFAULT_CLOSE_READING_SOURCE_WIDTH),
  };
}
