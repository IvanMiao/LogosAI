import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkspaceSyncRecovery } from '@/pages/workspace/components/WorkspaceSyncRecovery';
import type { ReadingConflict } from '@/features/reading/reading-session-merge';

const conflict: ReadingConflict = { sessionId: 'reading', title: 'Reading with notes', localDeleted: false, remoteDeleted: false,
  items: [{ key: 'artifact:note', label: 'Note or reading result', local: 'Local note', remote: 'Cloud note' }] };
afterEach(cleanup);

it('shows both note versions and offers keeping both without duplicating a reading', () => {
  const onResolve = vi.fn();
  render(<WorkspaceSyncRecovery conflicts={[conflict]} onResolve={onResolve} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review sync changes' }));
  expect(screen.getByRole('dialog').textContent).toContain('Local note');
  expect(screen.getByRole('dialog').textContent).toContain('Cloud note');
  fireEvent.click(screen.getByRole('button', { name: 'Keep both versions' }));
  expect(onResolve).toHaveBeenCalledWith(conflict, 'both');
});

it('makes remote deletion recovery explicit and allows deferring a decision', () => {
  const onResolve = vi.fn();
  render(<WorkspaceSyncRecovery conflicts={[{ ...conflict, remoteDeleted: true,
    items: [{ label: 'Reading deletion', local: 'Offline note', remote: 'Deleted' }] }]} onResolve={onResolve} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review sync changes' }));
  expect(screen.getByRole('button', { name: 'Restore local version as a new reading' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Keep both versions' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onResolve).not.toHaveBeenCalled();
});

it('does not interrupt reading when there are no conflicts', () => {
  render(<WorkspaceSyncRecovery conflicts={[]} onResolve={vi.fn()} />);
  expect(screen.queryByRole('status')).toBeNull();
});
