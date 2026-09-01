/**
 * Executable specification for docs/ux/workspace-journey-contract.md.
 * Keep the test and UX contract synchronized in the same change.
 */
import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readStoredAnchors, writeStoredAnchors, type TextAnchor } from '@/features/anchors';
import { readStoredArtifacts, writeStoredArtifacts, type Artifact } from '@/features/artifacts';
import { writeStoredDocument } from '@/features/reading/reading-storage';
import { WorkspacePage } from '@/pages/workspace';

const TEST_USER_ID = 'test-user';
const journeyDocument = {
  id: 'journey-document',
  title: 'Two paragraph journey',
  text: 'First paragraph for close reading.\n\nSecond paragraph for comparison.',
  sourceType: 'paste' as const,
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
};
const firstParagraphQuote = 'First paragraph for close reading.';
const savedSelectionAnchor: TextAnchor = {
  id: 'saved-selection-anchor',
  documentId: journeyDocument.id,
  scope: 'selection',
  quote: 'paragraph for close reading',
  normalizedQuote: 'paragraph for close reading',
  quoteHash: 'saved-selection-hash',
  startOffset: 6,
  endOffset: 33,
  createdAt: '2026-07-21T08:30:00.000Z',
};
const secondSelectionAnchor: TextAnchor = {
  id: 'second-selection-anchor',
  documentId: journeyDocument.id,
  scope: 'selection',
  quote: 'paragraph for comparison',
  normalizedQuote: 'paragraph for comparison',
  quoteHash: 'second-selection-hash',
  startOffset: 43,
  endOffset: 67,
  createdAt: '2026-07-21T08:45:00.000Z',
};
const documentAnchor: TextAnchor = {
  id: 'document-anchor',
  documentId: journeyDocument.id,
  scope: 'document',
  quote: journeyDocument.text,
  normalizedQuote: journeyDocument.text,
  quoteHash: 'document-hash',
  startOffset: 0,
  endOffset: journeyDocument.text.length,
  createdAt: '2026-07-21T09:00:00.000Z',
};

function createAnalysisResponse(result: string): Response {
  const body = [
    'event: stage\ndata: {"stage":"interpret"}\n\n',
    `event: chunk\ndata: ${JSON.stringify({ delta: result })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ result })}\n\n`,
  ].join('');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function createAnchorResponse(anchorId: string, result: string): Response {
  const metadata = { request_id: 'request-explain', trace_id: 'trace-explain', anchor_id: anchorId };
  const body = [
    `event: stage\ndata: ${JSON.stringify({ ...metadata, stage: 'interpret' })}\n\n`,
    `event: chunk\ndata: ${JSON.stringify({ ...metadata, delta: result })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ ...metadata, result })}\n\n`,
  ].join('');
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function createArtifact(
  id: string,
  anchorId: string,
  type: Artifact['type'],
  content: string,
  updatedAt: string,
): Artifact {
  return {
    id,
    documentId: journeyDocument.id,
    anchorId,
    type,
    title: type === 'close_read' ? 'Close Reading' : 'Explanation',
    content,
    status: 'complete',
    createdAt: updatedAt,
    updatedAt,
  };
}

function seedReadingWork(
  anchors: TextAnchor[],
  artifactsByAnchorId: Record<string, Artifact[]>,
  activeAnchorId: string | null = null,
) {
  writeStoredAnchors({
    anchorsById: Object.fromEntries(anchors.map((anchor) => [anchor.id, anchor])),
    activeAnchorId,
  }, TEST_USER_ID);
  writeStoredArtifacts({ artifactsByAnchorId, tasksByRequestId: {} }, TEST_USER_ID);
}

function renderWorkspace(hasApiKey = true) {
  return render(
    <MemoryRouter>
      <WorkspacePage
        userId={TEST_USER_ID}
        hasApiKey={hasApiKey}
        model="gemini-2.5-flash"
      />
    </MemoryRouter>,
  );
}

describe('workspace journey contract', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    writeStoredDocument(journeyDocument, TEST_USER_ID);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to dual panes and keeps layout controls separate from History', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByRole('button', { name: 'Show source and analysis' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Close Reading' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    expect(screen.getByRole('button', { name: 'Show source only' }))
      .toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Show analysis only' }));
    expect(screen.getByRole('button', { name: 'Show analysis only' }))
      .toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort session history' })).toHaveValue('recent');
  });

  it('treats paragraph actions as saved Explain work', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createAnchorResponse('generated-paragraph-anchor', 'A paragraph explanation.'),
    ));
    renderWorkspace();

    await user.click(screen.getAllByRole('button', { name: 'Explain paragraph' })[0]);
    expect(await screen.findByText('A paragraph explanation.')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Current explanation' })).toBeInTheDocument();

    const artifacts = Object.values(readStoredArtifacts(TEST_USER_ID).artifactsByAnchorId).flat();
    expect(artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'explanation', status: 'complete' }),
    ]));
    expect(artifacts.some((artifact) => artifact.type === 'close_read')).toBe(false);
    expect(Object.values(readStoredAnchors(TEST_USER_ID).anchorsById))
      .toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'paragraph' })]));
  });

  it('creates Close Reading only for the whole document', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createAnalysisResponse('Whole-document reading.')));
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Start Close Reading' }));
    expect(await screen.findByText('Whole-document reading.')).toBeInTheDocument();

    const anchors = Object.values(readStoredAnchors(TEST_USER_ID).anchorsById);
    const artifacts = Object.values(readStoredArtifacts(TEST_USER_ID).artifactsByAnchorId).flat();
    expect(anchors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'document' })]));
    expect(artifacts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'close_read' })]));
  });

  it('opens Explain inside Close Reading and returns to the same analysis', async () => {
    const user = userEvent.setup();
    const closeReading = createArtifact(
      'whole-close-reading',
      documentAnchor.id,
      'close_read',
      'Persistent whole-text interpretation.',
      '2026-07-21T11:00:00.000Z',
    );
    const explanation = createArtifact(
      'saved-explanation',
      savedSelectionAnchor.id,
      'explanation',
      'Saved selection explanation.',
      '2026-07-21T10:00:00.000Z',
    );
    seedReadingWork(
      [documentAnchor, savedSelectionAnchor],
      { [documentAnchor.id]: [closeReading], [savedSelectionAnchor.id]: [explanation] },
    );
    renderWorkspace();

    expect(screen.getByText(closeReading.content)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open saved selection' }));
    expect(screen.getByText(explanation.content)).toBeInTheDocument();
    expect(screen.queryByText(closeReading.content)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Close Reading' }));
    expect(screen.getByText(closeReading.content)).toBeInTheDocument();
    expect(screen.queryByText(explanation.content)).not.toBeInTheDocument();
  });

  it('restores the selected Close Reading revision after a mode switch', async () => {
    const user = userEvent.setup();
    const latestReading = createArtifact(
      'latest-close-reading',
      documentAnchor.id,
      'close_read',
      'Latest whole-text interpretation.',
      '2026-07-21T12:00:00.000Z',
    );
    const earlierReading = createArtifact(
      'earlier-close-reading',
      documentAnchor.id,
      'close_read',
      'Earlier whole-text interpretation.',
      '2026-07-21T10:00:00.000Z',
    );
    seedReadingWork(
      [documentAnchor],
      { [documentAnchor.id]: [latestReading, earlierReading] },
    );
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open Close Reading outputs' }));
    await user.click(screen.getAllByRole('menuitem')[1]);
    expect(screen.getByText(earlierReading.content)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show source only' }));
    await user.click(screen.getByRole('button', { name: 'Show source and analysis' }));

    expect(screen.getByText(earlierReading.content)).toBeInTheDocument();
    expect(screen.queryByText(latestReading.content)).not.toBeInTheDocument();
  });

  it('queries History only when opened and supports recent and source order', async () => {
    const user = userEvent.setup();
    const earlierSourceNewer = createArtifact(
      'newer-first-source',
      savedSelectionAnchor.id,
      'explanation',
      'Newest result at the earlier source.',
      '2026-07-21T12:00:00.000Z',
    );
    const laterSourceOlder = createArtifact(
      'older-later-source',
      secondSelectionAnchor.id,
      'translation',
      'Older result at the later source.',
      '2026-07-21T10:00:00.000Z',
    );
    seedReadingWork(
      [savedSelectionAnchor, secondSelectionAnchor],
      {
        [savedSelectionAnchor.id]: [earlierSourceNewer],
        [secondSelectionAnchor.id]: [laterSourceOlder],
      },
    );
    renderWorkspace();

    expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'History' }));
    const historyList = screen.getByRole('list');
    expect(within(historyList).getAllByRole('button')[0]).toHaveTextContent(savedSelectionAnchor.quote);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort session history' }),
      'source',
    );
    expect(within(historyList).getAllByRole('button')[0]).toHaveTextContent(savedSelectionAnchor.quote);
    expect(within(historyList).getAllByRole('button')[1]).toHaveTextContent(secondSelectionAnchor.quote);
  });

  it('opens a History result in Text and restores its exact source range', async () => {
    const user = userEvent.setup();
    const explanation = createArtifact(
      'history-explanation',
      secondSelectionAnchor.id,
      'explanation',
      'History explanation detail.',
      '2026-07-21T12:00:00.000Z',
    );
    seedReadingWork([secondSelectionAnchor], { [secondSelectionAnchor.id]: [explanation] });
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'History' }));
    await user.click(screen.getByRole('button', { name: 'Open in Text' }));

    expect(screen.getByRole('button', { name: 'Show source and analysis' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(secondSelectionAnchor.quote).some(
      (element) => element.tagName === 'MARK',
    )).toBe(true);
    expect(screen.getByText(explanation.content)).toBeInTheDocument();
  });

  it('keeps reading appearance unified by default and allows explicit font unlinking', async () => {
    const user = userEvent.setup();
    const closeReading = createArtifact(
      'appearance-reading',
      documentAnchor.id,
      'close_read',
      'Typography comparison reading.',
      '2026-07-21T12:00:00.000Z',
    );
    seedReadingWork([documentAnchor], { [documentAnchor.id]: [closeReading] });
    renderWorkspace();

    const sourceArticle = screen.getByText(firstParagraphQuote).closest('article');
    const analysisBody = screen.getByText(closeReading.content).closest('.close-reading-prose');
    expect(sourceArticle).toHaveClass('font-serif');
    expect(analysisBody).toHaveClass('font-serif');
    expect(sourceArticle).toHaveStyle({ fontSize: '18px', maxWidth: 'min(760px, 68ch)' });
    expect(analysisBody).toHaveStyle({ fontSize: '18px', maxWidth: '760px' });

    await user.click(screen.getByRole('button', { name: 'Reading appearance' }));
    fireEvent.change(screen.getByRole('slider', { name: /Text size/ }), { target: { value: '21' } });
    expect(sourceArticle).toHaveStyle({ fontSize: '21px' });
    expect(analysisBody).toHaveStyle({ fontSize: '21px' });
    await user.click(screen.getByRole('button', { name: /Sans/ }));
    expect(sourceArticle).toHaveClass('font-sans');
    expect(analysisBody).toHaveClass('font-sans');

    await user.click(screen.getByRole('checkbox', { name: 'Keep source and analysis matched' }));
    await user.click(within(screen.getByRole('group', { name: 'Analysis font' }))
      .getByRole('button', { name: /Mono/ }));
    expect(sourceArticle).toHaveClass('font-sans');
    expect(analysisBody).toHaveClass('font-mono');
  });

  it('pins and collapses a flat Sessions navigation', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open reading sessions' }));
    const sessionsDialog = screen.getByRole('dialog', { name: 'Reading sessions' });
    const sessionButton = within(sessionsDialog).getByText('Two paragraph journey')
      .closest('button');
    const sessionCard = sessionButton?.closest('article');
    if (!sessionCard) throw new Error('Expected the reading session card to render');
    expect(sessionsDialog).toHaveClass('min-w-0', 'overflow-x-hidden');
    expect(sessionCard).toHaveClass('min-w-0', 'overflow-hidden');
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    const sessionsNavigation = screen.getByRole('navigation', { name: 'Reading sessions' });
    expect(within(sessionsNavigation).getByText('Two paragraph journey')).toBeInTheDocument();
    expect(localStorage.getItem(`logosai.workspace.sessionsPinned:v1:${TEST_USER_ID}`)).toBe('true');

    await user.click(within(sessionsNavigation).getByRole('button', {
      name: 'Collapse sessions sidebar',
    }));
    expect(screen.queryByRole('navigation', { name: 'Reading sessions' })).not.toBeInTheDocument();
  });

  it('shows streaming stage progress before content arrives', async () => {
    const user = userEvent.setup();
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
        },
      }),
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    )));
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Start Close Reading' }));
    await act(async () => {
      streamController?.enqueue(encoder.encode(
        'event: stage\ndata: {"stage":"interpret"}\n\n',
      ));
    });
    expect(await screen.findByText('Interpreting the full text…')).toBeInTheDocument();

    await act(async () => {
      streamController?.enqueue(encoder.encode(
        'event: done\ndata: {"result":"Finished streamed reading."}\n\n',
      ));
      streamController?.close();
    });
    expect(await screen.findByText('Finished streamed reading.')).toBeInTheDocument();
  });

  it('does not pollute History when the API key is missing', async () => {
    const user = userEvent.setup();
    renderWorkspace(false);

    await user.click(screen.getAllByRole('button', { name: 'Explain paragraph' })[0]);
    expect(screen.getByRole('alert')).toHaveTextContent('Gemini API key missing');
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'Open Settings' }))
      .toHaveAttribute('href', '/app/settings');
    expect(Object.values(readStoredArtifacts(TEST_USER_ID).artifactsByAnchorId).flat()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'No saved work yet' })).toBeInTheDocument();
  });

  it('recovers an interrupted Close Reading as retryable', () => {
    const interrupted: Artifact = {
      ...createArtifact(
        'interrupted-reading',
        documentAnchor.id,
        'close_read',
        'Partial reading.',
        '2026-07-21T12:00:00.000Z',
      ),
      status: 'running',
      requestId: 'request-before-reload',
    };
    seedReadingWork([documentAnchor], { [documentAnchor.id]: [interrupted] });
    renderWorkspace();

    const pane = screen.getByRole('complementary', { name: 'Close reading' });
    expect(within(pane).getByText('stopped')).toBeInTheDocument();
    expect(within(pane).getByRole('button', { name: 'Retry artifact' })).toBeEnabled();
    expect(within(pane).queryByRole('button', { name: 'Stop artifact' })).not.toBeInTheDocument();
  });
});
