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
        ? 'mx-auto grid max-w-[1500px] lg:grid-cols-[minmax(0,1.65fr)_minmax(22rem,1fr)]'
        : 'mx-auto grid max-w-[1500px] grid-cols-1'}
    >
      <div>{readingSurface}</div>
      {detailPanel ? (
        <div className="border-e-2 border-border">{detailPanel}</div>
      ) : null}
    </div>
  );
}
