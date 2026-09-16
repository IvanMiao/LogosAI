import { useEffect, useRef, useState } from 'react';

export function useReaderToolbarLayout() {
  const toolbarRef = useRef<HTMLElement | null>(null);
  const [isToolbarCondensed, setIsToolbarCondensed] = useState(true);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar || typeof ResizeObserver === 'undefined') return;

    // Observe the content box to match the toolbar's 900px CSS container query.
    // The menu is portalled outside that container, so it needs the same state.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setIsToolbarCondensed(entry.contentRect.width < 900);
    });
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  return { toolbarRef, isToolbarCondensed };
}
