import type { ReactElement } from 'react';
import { GripVertical } from 'lucide-react';
import {
  MAX_CLOSE_READING_SOURCE_WIDTH,
  MIN_CLOSE_READING_SOURCE_WIDTH,
} from '@/features/reading/reading-storage';
import { useCloseReadingResize } from '../useCloseReadingResize';

interface CloseReadingSplitLayoutProps {
  readingSurface: ReactElement;
  closeReadingPane: ReactElement;
}

export function CloseReadingSplitLayout({
  readingSurface,
  closeReadingPane,
}: CloseReadingSplitLayoutProps): ReactElement {
  const resize = useCloseReadingResize();

  return (
    <div
      ref={resize.containerRef}
      className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(380px,var(--close-reading-source-width))_12px_minmax(560px,1fr)]"
      style={resize.gridStyle}
    >
      <div id="close-reading-source-pane" className="hidden lg:block">
        {readingSurface}
      </div>
      <div
        ref={resize.separatorRef}
        role="separator"
        tabIndex={0}
        aria-label="Resize source and Close Reading panes"
        aria-controls="close-reading-source-pane close-reading-analysis-pane"
        aria-orientation="vertical"
        aria-valuemin={MIN_CLOSE_READING_SOURCE_WIDTH}
        aria-valuemax={MAX_CLOSE_READING_SOURCE_WIDTH}
        aria-valuenow={Math.round(resize.sourceWidth)}
        title="Drag to resize. Use arrow keys for precise control."
        className="group hidden touch-none cursor-col-resize items-center justify-center border-x-2 border-border bg-background hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:flex"
        onPointerDown={resize.onPointerDown}
        onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerEnd}
        onPointerCancel={resize.onPointerEnd}
        onKeyDown={resize.onKeyDown}
        onDoubleClick={resize.resetSourceWidth}
      >
        <GripVertical className="h-5 w-5 transition-transform group-hover:scale-110" />
      </div>
      <div id="close-reading-analysis-pane">{closeReadingPane}</div>
    </div>
  );
}
