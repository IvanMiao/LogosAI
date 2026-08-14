import { useEffect, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function getIsDesktopViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  }

  return window.innerWidth >= 1024;
}

export function useWorkspaceViewport(): boolean {
  const [isDesktopViewport, setIsDesktopViewport] = useState(getIsDesktopViewport);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches);
    };

    setIsDesktopViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktopViewport;
}
