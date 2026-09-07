import type { ReactElement, ReactNode } from 'react';
import { MissingApiKeyBanner } from '@/components/MissingApiKeyBanner';
import { cn } from '@/utils/class-name';
import { WorkspaceHeader, type WorkspaceAppChromeProps } from './WorkspaceHeader';

interface WorkspacePageLayoutProps {
  appChrome: WorkspaceAppChromeProps;
  isReading: boolean;
  error: string;
  sidebar: ReactNode;
  library: ReactNode;
  children: ReactNode;
}

export function WorkspacePageLayout({
  appChrome, isReading, error, sidebar, library, children,
}: WorkspacePageLayoutProps): ReactElement {
  return (
    <div className={cn(
      'bg-background text-foreground',
      isReading ? 'flex h-dvh min-h-0 flex-col overflow-hidden' : 'min-h-dvh',
    )}>
      {!isReading ? <WorkspaceHeader {...appChrome} /> : null}
      {appChrome.viewModel.apiKeyStatusTone === 'missing' ? <MissingApiKeyBanner /> : null}
      {error ? (
        <p
          role="alert"
          className="shrink-0 border-b-2 border-border bg-destructive px-4 py-2 text-center font-mono text-sm font-bold text-destructive-foreground"
        >
          {error}
        </p>
      ) : null}
      <div className={cn('flex min-w-0 items-start', isReading ? 'min-h-0 flex-1 items-stretch' : '')}>
        {sidebar}
        <main
          id="main-content"
          data-route-focus
          tabIndex={-1}
          className={cn('min-w-0 flex-1', isReading ? 'flex h-full min-h-0 flex-col' : '')}
        >
          {children}
        </main>
      </div>
      {library}
    </div>
  );
}
