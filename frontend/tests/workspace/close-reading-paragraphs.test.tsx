import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAnchorFromRange, writeStoredAnchors } from '@/features/anchors';
import { writeStoredArtifacts, type Artifact } from '@/features/artifacts';
import { writeStoredDocumentLibrary } from '@/features/reading/reading-storage';
import { WorkspacePage } from '@/pages/workspace';

const userId = 'aligned-reader';
const document = {
  id: 'aligned-reading', title: 'Aligned reading', text: 'First passage.\n\nSecond passage.',
  sourceType: 'paste' as const, createdAt: '2026-11-13T00:00:00Z', updatedAt: '2026-11-13T00:00:00Z',
};
const documentAnchor = createAnchorFromRange({
  documentId: document.id, documentText: document.text,
  startOffset: 0, endOffset: document.text.length, scope: 'document',
})!;
const aligned = '[[OVERVIEW]]\nIntro notes.\n\n[[P1]]\nFirst notes.\n\n[[P2]]\nSecond notes.\n\n[[SYNTHESIS]]\nClosing notes.';
const closeReading: Artifact = {
  id: 'aligned-result', documentId: document.id, anchorId: documentAnchor.id, type: 'close_read',
  title: 'Close Reading', content: aligned, status: 'complete',
  createdAt: '2026-11-13T00:00:00Z', updatedAt: '2026-11-13T00:00:00Z',
};
const scrollIntoView = vi.fn();

function sse(events: Array<[string, object]>): Response {
  const body = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

function mount() {
  return render(<MemoryRouter initialEntries={[`/app/readings/${document.id}`]}>
    <WorkspacePage userId={userId} hasApiKey model="gemini-2.5-flash" />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  window.innerWidth = 1280;
  scrollIntoView.mockClear();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  writeStoredDocumentLibrary({ activeDocumentId: document.id, documentsById: { [document.id]: document } }, userId);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('paragraph-aligned Close Reading', () => {
  it('jumps from a paragraph block to that paragraph in the source', async () => {
    writeStoredAnchors({ anchorsById: { [documentAnchor.id]: documentAnchor }, activeAnchorId: null }, userId);
    writeStoredArtifacts({ artifactsByAnchorId: { [documentAnchor.id]: [closeReading] }, tasksByRequestId: {} }, userId);
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    mount();

    const pane = await screen.findByRole('complementary', { name: 'Close Reading' });
    expect(within(pane).getByText('Overview')).toBeInTheDocument();
    expect(within(pane).getByText('Synthesis')).toBeInTheDocument();
    expect(pane).not.toHaveTextContent('[[');
    await user.click(within(pane).getByRole('button', { name: 'Show paragraph 2 in source' }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const target = scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1] as HTMLElement;
    expect(target).toHaveAttribute('data-paragraph-number', '2');
    expect(target).toHaveTextContent('Second passage.');
    expect(target).toHaveClass('bg-secondary/10');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('switches a narrow screen to the source when jumping', async () => {
    window.innerWidth = 480;
    writeStoredAnchors({ anchorsById: { [documentAnchor.id]: documentAnchor }, activeAnchorId: null }, userId);
    writeStoredArtifacts({ artifactsByAnchorId: { [documentAnchor.id]: [closeReading] }, tasksByRequestId: {} }, userId);
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Show analysis only' }));
    const pane = await screen.findByRole('complementary', { name: 'Close Reading' });
    await user.click(within(pane).getByRole('button', { name: 'Show paragraph 1 in source' }));

    expect(await screen.findByRole('region', { name: 'Reading surface' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Close Reading' })).not.toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const target = scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1] as HTMLElement;
    expect(target).toHaveAttribute('data-paragraph-number', '1');

    // Remounting the source later must not replay the jump.
    await user.click(screen.getByRole('button', { name: 'Show analysis only' }));
    scrollIntoView.mockClear();
    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    await screen.findByRole('region', { name: 'Reading surface' });
    await new Promise((resolve) => { window.setTimeout(resolve, 20); });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('jumps from a source paragraph to its block in the Close Reading', async () => {
    writeStoredAnchors({ anchorsById: { [documentAnchor.id]: documentAnchor }, activeAnchorId: null }, userId);
    writeStoredArtifacts({ artifactsByAnchorId: { [documentAnchor.id]: [closeReading] }, tasksByRequestId: {} }, userId);
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    mount();

    const source = await screen.findByRole('region', { name: 'Reading surface' });
    await user.click(within(source).getByRole('button', { name: 'Show Close Reading of paragraph 2' }));

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const target = scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1] as HTMLElement;
    expect(target).toHaveAttribute('data-close-reading-block', 'paragraph');
    expect(target).toHaveTextContent('Second notes.');
    expect(target).toHaveClass('bg-secondary/10');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('switches a narrow screen to the Close Reading when jumping from the source', async () => {
    window.innerWidth = 480;
    writeStoredAnchors({ anchorsById: { [documentAnchor.id]: documentAnchor }, activeAnchorId: null }, userId);
    writeStoredArtifacts({ artifactsByAnchorId: { [documentAnchor.id]: [closeReading] }, tasksByRequestId: {} }, userId);
    vi.stubGlobal('fetch', vi.fn());
    const user = userEvent.setup();
    mount();

    const source = await screen.findByRole('region', { name: 'Reading surface' });
    await user.click(within(source).getByRole('button', { name: 'Show Close Reading of paragraph 1' }));

    const pane = await screen.findByRole('complementary', { name: 'Close Reading' });
    expect(screen.queryByRole('region', { name: 'Reading surface' })).not.toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const target = scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1] as HTMLElement;
    expect(pane).toContainElement(target);
    expect(target).toHaveTextContent('First notes.');

    // Remounting the Close Reading later must not replay the jump.
    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    scrollIntoView.mockClear();
    await user.click(screen.getByRole('button', { name: 'Show analysis only' }));
    await screen.findByRole('complementary', { name: 'Close Reading' });
    await new Promise((resolve) => { window.setTimeout(resolve, 20); });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('offers no jump from the source without an aligned Close Reading', async () => {
    const legacy = { ...closeReading, content: '# Legacy reading\n\nOne continuous lecture.' };
    writeStoredAnchors({ anchorsById: { [documentAnchor.id]: documentAnchor }, activeAnchorId: null }, userId);
    writeStoredArtifacts({ artifactsByAnchorId: { [documentAnchor.id]: [legacy] }, tasksByRequestId: {} }, userId);
    vi.stubGlobal('fetch', vi.fn());
    mount();

    expect(await screen.findByText('One continuous lecture.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show Close Reading of paragraph/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show paragraph \d+ in source/ })).not.toBeInTheDocument();
  });

  it('sends the source paragraphs and replaces a misaligned first attempt', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse([
      ['stage', { stage: 'interpret' }],
      ['chunk', { delta: 'Misaligned first attempt.' }],
      ['stage', { stage: 'retry' }],
      ['chunk', { delta: aligned }],
      ['done', { result: aligned }],
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'Start Close Reading' }));

    const pane = await screen.findByRole('complementary', { name: 'Close Reading' });
    expect(await within(pane).findByText('Second notes.')).toBeInTheDocument();
    expect(pane).not.toHaveTextContent('Misaligned first attempt.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analyze/stream');
    expect(JSON.parse(init.body)).toMatchObject({
      text: document.text, paragraphs: ['First passage.', 'Second passage.'],
    });
  });
});
