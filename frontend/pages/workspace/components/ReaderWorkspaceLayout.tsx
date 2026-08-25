import type { ReactElement } from 'react';
interface ReaderWorkspaceLayoutProps {
  readingSurface: ReactElement;
  detailPanel: ReactElement | null;
}

export function ReaderWorkspaceLayout({
  readingSurface,
  detailPanel,
}: ReaderWorkspaceLayoutProps): ReactElement {
  return (
    <div
      className={detailPanel
        ? 'mx-auto grid h-full min-h-0 w-full max-w-[1800px] lg:grid-cols-[minmax(0,1.65fr)_minmax(22rem,1fr)]'
        : 'mx-auto grid h-full min-h-0 w-full max-w-[1800px] grid-cols-1'}
    >
      <div className="min-h-0">{readingSurface}</div>
      {detailPanel ? (
        <div className="min-h-0">{detailPanel}</div>
      ) : null}
    </div>
  );
}
