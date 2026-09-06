import type { ReactElement } from 'react';

interface ReaderWorkspaceLayoutProps {
  readingSurface: ReactElement;
}

export function ReaderWorkspaceLayout({
  readingSurface,
}: ReaderWorkspaceLayoutProps): ReactElement {
  return (
    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1800px] grid-cols-1">
      <div className="min-h-0">{readingSurface}</div>
    </div>
  );
}
