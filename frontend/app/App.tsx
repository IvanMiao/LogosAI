import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { RequireAuth } from '@/features/auth';
import { LandingPage } from '@/pages/landing';
import { AppLayout } from './AppLayout';
import { LegacyAppFrame } from './LegacyAppFrame';
import { RouteAccessibility } from './RouteAccessibility';

const AuthPage = lazy(async () => {
  const module = await import('@/pages/auth');
  return { default: module.AuthPage };
});
const AuthenticatedWorkspacePage = lazy(async () => {
  const module = await import('@/pages/workspace');
  return { default: module.AuthenticatedWorkspacePage };
});
const AuthenticatedAnalysisPage = lazy(async () => {
  const module = await import('@/pages/analysis');
  return { default: module.AuthenticatedAnalysisPage };
});
const AuthenticatedSettingsPage = lazy(async () => {
  const module = await import('@/pages/settings');
  return { default: module.AuthenticatedSettingsPage };
});
const AboutPage = lazy(async () => {
  const module = await import('@/pages/about');
  return { default: module.AboutPage };
});

function RouteLoadingState(): ReactElement {
  return (
    <main
      id="main-content"
      data-route-focus
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background p-6"
    >
      <div role="status" className="flex items-center gap-3 border-2 border-border bg-card p-4 font-mono font-bold shadow-hard">
        <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
        Opening LogosAI…
      </div>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-50 border-2 border-border bg-card p-3 font-mono font-bold shadow-hard focus:not-sr-only"
      >
        Skip to main content
      </a>
      <RouteAccessibility />
      <Suspense fallback={<RouteLoadingState />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/register" element={<AuthPage mode="sign-up" />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<AuthenticatedWorkspacePage />} />
              <Route path="readings/:documentId" element={<AuthenticatedWorkspacePage />} />
              <Route path="new" element={<AuthenticatedWorkspacePage />} />
              <Route
                path="analysis"
                element={(
                  <LegacyAppFrame>
                    <AuthenticatedAnalysisPage />
                  </LegacyAppFrame>
                )}
              />
              <Route
                path="settings"
                element={(
                  <LegacyAppFrame>
                    <AuthenticatedSettingsPage />
                  </LegacyAppFrame>
                )}
              />
              <Route
                path="about"
                element={(
                  <LegacyAppFrame>
                    <AboutPage />
                  </LegacyAppFrame>
                )}
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
