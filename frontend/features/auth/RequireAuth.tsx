import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useAuth } from './useAuth';

function AuthLoadingState(): ReactElement {
  return (
    <main
      id="main-content"
      data-route-focus
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background p-6"
    >
      <div role="status" className="border-2 border-border bg-card p-6 text-center shadow-hard">
        <Brain className="mx-auto h-7 w-7 motion-safe:animate-pulse" aria-hidden="true" />
        <p className="mt-3 font-mono text-sm font-bold">Opening your workspace…</p>
      </div>
    </main>
  );
}

export function RequireAuth(): ReactElement {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <AuthLoadingState />;
  }

  if (auth.status === 'anonymous') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
