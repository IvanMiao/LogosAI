import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspacePage } from '@/pages/workspace';
import { getCloudWorkspace } from '@/client-api/workspace-api';
import type { CloudWorkspaceState } from '@/features/reading';
import { DEFAULT_READER_PREFERENCES, writeStoredDocument } from '@/features/reading/reading-storage';

vi.mock('@/client-api/workspace-api', () => ({
  getCloudWorkspace: vi.fn(),
  saveCloudReadingSession: vi.fn().mockResolvedValue({ revision: 1 }),
  saveCloudWorkspacePreferences: vi.fn().mockResolvedValue({}),
  deleteCloudReadingSession: vi.fn().mockResolvedValue(undefined),
}));
const cached = { id: 'cached', title: 'Cached document', text: 'Cached private text.', sourceType: 'paste' as const,
  createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z' };
const cloud: CloudWorkspaceState = {
  preferences: { activeDocumentId: cached.id, readerPreferences: DEFAULT_READER_PREFERENCES, analysisLanguage: 'en' },
  sessions: [{ document: { ...cached, id: 'remote', title: 'Remote target', text: 'Requested remote text.' },
    activeAnchorId: null, anchors: [], artifacts: [], revision: 1, syncedAt: cached.createdAt }],
};
function mount() {
  return render(<MemoryRouter initialEntries={['/app/readings/remote']}>
    <WorkspacePage userId="cloud-reader" hasApiKey model="gemini-2.5-flash" cloudSyncEnabled />
  </MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); writeStoredDocument(cached, 'cloud-reader'); });

describe('reading deep links while cloud data loads', () => {
  it('waits for hydration without flashing a cached document or a missing-target error', async () => {
    let resolve!: (state: CloudWorkspaceState) => void;
    vi.mocked(getCloudWorkspace).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    mount();
    expect(screen.getByText('Opening reading…')).toBeInTheDocument();
    expect(screen.queryByText(cached.text)).not.toBeInTheDocument();
    expect(screen.queryByText(/This reading is unavailable/)).not.toBeInTheDocument();
    await act(async () => resolve(cloud));
    expect(await screen.findByText('Requested remote text.')).toBeInTheDocument();
    expect(screen.queryByText(cached.text)).not.toBeInTheDocument();
  });

  it('fetches again after an offline deep link is retried', async () => {
    vi.mocked(getCloudWorkspace).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(cloud);
    mount();
    expect(await screen.findByText(/This reading is unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry cloud sync' }));
    expect(await screen.findByText('Requested remote text.')).toBeInTheDocument();
    expect(getCloudWorkspace).toHaveBeenCalledTimes(2);
  });
});
