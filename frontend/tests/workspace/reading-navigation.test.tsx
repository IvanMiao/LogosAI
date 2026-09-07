import '@testing-library/jest-dom/vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAnchorFromRange, writeStoredAnchors } from '@/features/anchors';
import { writeStoredArtifacts, type Artifact } from '@/features/artifacts';
import { writeStoredDocumentLibrary } from '@/features/reading/reading-storage';
import { WorkspacePage } from '@/pages/workspace';
import { readingViewKey } from '@/pages/workspace/reading-view-storage';

const userId = 'navigation-reader';
const documentA = {
  id: 'reading-a', title: 'Reading A', text: 'First passage.\n\nSecond passage to revisit.',
  sourceType: 'paste' as const, createdAt: '2026-09-07T00:00:00Z', updatedAt: '2026-09-07T00:00:00Z',
};
const documentB = { ...documentA, id: 'reading-b', title: 'Reading B', text: 'A different reading.' };
const anchor = createAnchorFromRange({
  documentId: documentA.id, documentText: documentA.text,
  startOffset: 16, endOffset: documentA.text.length, scope: 'selection',
})!;
const oldResult: Artifact = {
  id: 'old-result', documentId: documentA.id, anchorId: anchor.id, type: 'explanation',
  title: 'Earlier explanation', content: 'The earlier interpretation.', status: 'complete',
  createdAt: '2026-09-06T00:00:00Z', updatedAt: '2026-09-06T00:00:00Z',
};
const newResult = { ...oldResult, id: 'new-result', title: 'Later explanation', content: 'The later interpretation.', updatedAt: '2026-09-07T00:00:00Z' };

function RouteControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return <div>
    <output aria-label="Address">{location.pathname}{location.search}</output>
    <button onClick={() => navigate('/app/readings/reading-a')}>Visit A</button>
    <button onClick={() => navigate('/app/readings/reading-b')}>Visit B</button>
    <button onClick={() => navigate(-1)}>Browser back</button>
  </div>;
}

function mount(path = '/app', account = userId) {
  return render(<MemoryRouter initialEntries={[path]}>
    <RouteControls />
    <WorkspacePage userId={account} hasApiKey model="gemini-2.5-flash" />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 1280;
  vi.stubGlobal('fetch', vi.fn());
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  writeStoredDocumentLibrary({ activeDocumentId: documentB.id, documentsById: {
    [documentA.id]: documentA, [documentB.id]: documentB,
  } }, userId);
  writeStoredAnchors({ anchorsById: { [anchor.id]: anchor }, activeAnchorId: anchor.id,
    activeAnchorIdByDocumentId: { [documentA.id]: anchor.id } }, userId);
  writeStoredArtifacts({ artifactsByAnchorId: { [anchor.id]: [newResult, oldResult] }, tasksByRequestId: {} }, userId);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('reading addresses and scene restoration', () => {
  it('opens a result deep link over a different cached document without asking AI', async () => {
    mount('/app/readings/reading-a?artifact=old-result');
    expect(await screen.findByText(oldResult.content)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reading A');
    expect(fetch).not.toHaveBeenCalled();
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('restores History filters, selected result and list position after opening text and returning', async () => {
    const user = userEvent.setup();
    mount('/app/readings/reading-a');
    await user.click(screen.getByRole('button', { name: 'History' }));
    await user.type(screen.getByRole('searchbox'), 'earlier');
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort session history' }), { target: { value: 'source' } });
    const history = screen.getByRole('region', { name: 'History' });
    history.scrollTop = 340;
    fireEvent.scroll(history);
    await user.click(screen.getByRole('button', { name: 'Open in Text' }));
    expect(await screen.findByRole('complementary', { name: 'Current explanation' })).toHaveTextContent(oldResult.content);
    await user.click(screen.getByRole('button', { name: 'Back to History' }));
    expect(screen.getByRole('searchbox')).toHaveValue('earlier');
    expect(screen.getByRole('combobox', { name: 'Sort session history' })).toHaveValue('source');
    expect(screen.getByRole('region', { name: 'History' }).scrollTop).toBe(340);
    expect(screen.queryByText(newResult.content)).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('restores each document layout and source/output scroll positions on A → B → browser back', async () => {
    const user = userEvent.setup();
    mount('/app/readings/reading-a?artifact=old-result');
    await screen.findByText(oldResult.content);
    const source = screen.getByRole('region', { name: 'Reading surface' });
    const output = screen.getByRole('complementary', { name: 'Current explanation' });
    source.scrollTop = 520;
    output.scrollTop = 230;
    fireEvent.scroll(source);
    fireEvent.scroll(output);
    await user.click(screen.getByRole('button', { name: 'Show analysis only' }));
    await user.click(screen.getByRole('button', { name: 'Visit B' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Reading B');
    await user.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByText(oldResult.content)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show analysis only' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('complementary', { name: 'Current explanation' }).scrollTop).toBe(230);
    await user.click(screen.getByRole('button', { name: 'Show source and analysis' }));
    expect(screen.getByRole('region', { name: 'Reading surface' }).scrollTop).toBe(520);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('restores a saved scene on remount and falls back safely from a corrupt snapshot', async () => {
    const user = userEvent.setup();
    const first = mount('/app/readings/reading-a');
    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    first.unmount();
    const second = mount('/app/readings/reading-a');
    expect(screen.getByRole('button', { name: 'Show source only' })).toHaveAttribute('aria-pressed', 'true');
    second.unmount();
    localStorage.setItem(readingViewKey(userId, documentA.id), '{invalid');
    mount('/app/readings/reading-a');
    expect(screen.getByRole('button', { name: 'Show source and analysis' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not show another cached reading for an unavailable document or another account', async () => {
    const first = mount('/app/readings/missing');
    expect(screen.getByText(/This reading is unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reading surface' })).not.toBeInTheDocument();
    first.unmount();
    mount('/app/readings/reading-a', 'another-account');
    expect(screen.getByText(/This reading is unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(oldResult.content)).not.toBeInTheDocument();
  });

  it('removes a closed explanation from the address so reload does not reopen it', async () => {
    const user = userEvent.setup();
    const first = mount('/app/readings/reading-a?artifact=old-result');
    await screen.findByText(oldResult.content);
    await user.click(screen.getByRole('button', { name: 'Close explanation' }));
    expect(screen.getByLabelText('Address')).toHaveTextContent('/app/readings/reading-a');
    expect(screen.getByLabelText('Address')).not.toHaveTextContent('?artifact');
    first.unmount();
    mount('/app/readings/reading-a');
    expect(screen.queryByRole('complementary', { name: 'Current explanation' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the document available when the requested result no longer exists', async () => {
    mount('/app/readings/reading-a?artifact=deleted');
    expect(await screen.findByText(/This saved result is no longer available/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses memory for scene changes when local snapshot storage is full and reports the limitation', async () => {
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith('logosai.reading-view:')) throw new DOMException('Full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    });
    const user = userEvent.setup();
    mount('/app/readings/reading-a');
    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    await user.click(screen.getByRole('button', { name: 'Visit B' }));
    await user.click(screen.getByRole('button', { name: 'Visit A' }));
    expect(screen.getByRole('button', { name: 'Show source only' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Reading position could not be saved');
  });

  it('browser back from a saved result returns to the same History query', async () => {
    const user = userEvent.setup();
    mount('/app/readings/reading-a');
    await user.click(screen.getByRole('button', { name: 'History' }));
    await user.type(screen.getByRole('searchbox'), 'earlier');
    await user.click(screen.getByRole('button', { name: 'Open in Text' }));
    await user.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(screen.getByRole('searchbox')).toHaveValue('earlier');
    expect(within(screen.getByRole('region', { name: 'History' })).getByText(oldResult.content)).toBeInTheDocument();
  });
});
