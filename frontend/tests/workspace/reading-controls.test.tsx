import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReaderSyncAlert, WorkspaceAppActions } from '@/pages/workspace/components/WorkspaceHeader';
import type { WorkspaceViewModel } from '@/pages/workspace/workspace-types';

const viewModel: WorkspaceViewModel = {
  apiKeyStatusLabel: 'API key ready', apiKeyStatusTone: 'ready',
  cloudSyncLabel: 'Cloud sync failed. Select to retry.', cloudSyncTone: 'error',
};

describe('reader sync feedback', () => {
  it('allows retrying failed synchronization from the compact app menu', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <WorkspaceAppActions
          compact viewModel={viewModel} userName="Reader" userEmail=""
          onRetryCloudSync={onRetry} onOpenLibrary={vi.fn()} onSignOut={async () => undefined}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Open app menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Retry sync' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps retry directly available until synchronization recovers', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<ReaderSyncAlert viewModel={viewModel} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cloud sync failed.');
    await user.click(screen.getByRole('button', { name: 'Retry sync' }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<ReaderSyncAlert viewModel={{ ...viewModel, cloudSyncTone: 'offline' }} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cloud sync is paused.');
    rerender(<ReaderSyncAlert viewModel={{ ...viewModel, cloudSyncTone: 'saved' }} onRetry={onRetry} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
