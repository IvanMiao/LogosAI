import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'LogosAI',
  '/login': 'Sign in | LogosAI',
  '/register': 'Create account | LogosAI',
  '/app': 'LogosAI',
  '/app/analysis': 'INPUT_ZONE | LogosAI',
  '/app/settings': 'Settings | LogosAI',
  '/app/about': 'SYSTEM_MANIFEST | LogosAI',
};

export function RouteAccessibility() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] ?? 'LogosAI';

    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    const frameId = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-route-focus]')?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  return null;
}
