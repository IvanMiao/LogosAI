import type { ReactElement } from 'react';
import {
  MAX_CLOSE_READING_SOURCE_WIDTH,
  MIN_CLOSE_READING_SOURCE_WIDTH,
} from '@/features/reading/reading-storage';
import { useCloseReadingResize } from '../useCloseReadingResize';

interface CloseReadingSplitLayoutProps {
  storageScope: string;
  readingSurface: ReactElement;
  analysisPane: ReactElement;
}

export function CloseReadingSplitLayout({
  storageScope,
  readingSurface,
  analysisPane,
}: CloseReadingSplitLayoutProps): ReactElement {
  const resize = useCloseReadingResize(storageScope);

  return (
    <div
      ref={resize.containerRef}
      className="mx-auto grid h-full min-h-0 w-full max-w-[1800px] grid-cols-[minmax(20rem,var(--reader-source-width))_0.75rem_minmax(24rem,1fr)]"
      style={resize.gridStyle}
    >
      <div id="close-reading-source-pane" className="min-h-0">
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
        aria-valuetext={`Source ${Math.round(resize.sourceWidth)}%, analysis ${Math.round(100 - resize.sourceWidth)}%`}
        title="Drag to resize. Use arrow keys for precise control; hold Shift for larger steps."
        className="group relative flex touch-none cursor-col-resize items-stretch justify-center bg-background focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onPointerDown={resize.onPointerDown}
        onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerEnd}
        onPointerCancel={resize.onPointerEnd}
        onKeyDown={resize.onKeyDown}
        onDoubleClick={resize.resetSourceWidth}
      >
        <span
          aria-hidden="true"
          className="w-px bg-border transition-[width,background-color] duration-100 group-hover:w-0.5 group-hover:bg-primary group-focus-visible:w-0.5 group-focus-visible:bg-primary group-data-[dragging=true]:w-0.5 group-data-[dragging=true]:bg-primary"
        />
      </div>
      <div id="close-reading-analysis-pane" className="min-h-0">{analysisPane}</div>
    </div>
  );
}
