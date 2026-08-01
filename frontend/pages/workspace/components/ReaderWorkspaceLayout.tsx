import type { ReactElement } from 'react';
import { CloseReadingSplitLayout } from './CloseReadingSplitLayout';

interface ReaderWorkspaceLayoutProps {
  readingSurface: ReactElement;
  contextPanel: ReactElement;
  closeReadingPane: ReactElement | null;
  isContextOpen: boolean;
}

export function ReaderWorkspaceLayout({
  readingSurface,
  contextPanel,
  closeReadingPane,
  isContextOpen,
}: ReaderWorkspaceLayoutProps): ReactElement {
  const isCloseReadingOpen = isContextOpen && closeReadingPane !== null;

  if (isCloseReadingOpen) {
    return (
      <CloseReadingSplitLayout
        readingSurface={readingSurface}
        closeReadingPane={closeReadingPane}
      />
    );
  }

  return (
    <div
      className={isContextOpen
        ? 'mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_380px]'
        : 'mx-auto grid max-w-7xl grid-cols-1'}
    >
      <div>{readingSurface}</div>
      {isContextOpen ? (
        <div className="border-r-2 border-border">{contextPanel}</div>
      ) : null}
    </div>
  );
}
