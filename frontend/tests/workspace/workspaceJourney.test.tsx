/**
 * Executable specification for docs/ux/workspace-journey-contract.md.
 * Keep the test and UX contract synchronized in the same change.
 */
import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readStoredAnchors, writeStoredAnchors } from '@/features/anchors';
import { readStoredArtifacts, writeStoredArtifacts, type Artifact } from '@/features/artifacts';
import { WorkspacePage } from '@/pages/workspace';
import { writeStoredDocument } from '@/pages/workspace/workspace-storage';

const journeyDocument = {
  id: 'journey-document',
  title: 'Two paragraph journey',
  text: 'First paragraph for close reading.\n\nSecond paragraph for comparison.',
  sourceType: 'paste' as const,
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
};
const firstParagraphQuote = 'First paragraph for close reading.';
const firstParagraphAnchor = {
  id: 'first-paragraph-anchor',
  documentId: journeyDocument.id,
  scope: 'paragraph' as const,
  quote: firstParagraphQuote,
  normalizedQuote: firstParagraphQuote,
  quoteHash: 'first-paragraph-hash',
  startOffset: 0,
  endOffset: firstParagraphQuote.length,
  createdAt: '2026-07-21T08:00:00.000Z',
};
const savedSelectionAnchor = {
  id: 'saved-selection-anchor',
  documentId: journeyDocument.id,
  scope: 'selection' as const,
  quote: 'paragraph for close reading',
  normalizedQuote: 'paragraph for close reading',
  quoteHash: 'saved-selection-hash',
  startOffset: 6,
  endOffset: 33,
  createdAt: '2026-07-21T08:30:00.000Z',
};
const secondSelectionAnchor = {
  id: 'second-selection-anchor',
  documentId: journeyDocument.id,
  scope: 'selection' as const,
  quote: 'paragraph for comparison',
  normalizedQuote: 'paragraph for comparison',
  quoteHash: 'second-selection-hash',
  startOffset: 43,
  endOffset: 67,
  createdAt: '2026-07-21T08:45:00.000Z',
};

function createCloseReadingResponse(result: string): Response {
  const body = [
    'event: stage\ndata: {"stage":"interpret"}\n\n',
    `event: chunk\ndata: ${JSON.stringify({ delta: result })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ result })}\n\n`,
  ].join('');

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <WorkspacePage apiKey="test-key" hasApiKey model="gemini-2.5-flash" />
    </MemoryRouter>,
  );
}

function createCloseReading(
  id: string,
  title: string,
  content: string,
  createdAt: string,
): Artifact {
  return {
    id,
    documentId: journeyDocument.id,
    anchorId: firstParagraphAnchor.id,
    type: 'close_read',
    title,
    content,
    status: 'complete',
    createdAt,
    updatedAt: createdAt,
  };
}

function writeFirstParagraphArtifacts(
  artifacts: Artifact[],
  activeAnchorId: string | null,
) {
  writeStoredAnchors({
    anchorsById: { [firstParagraphAnchor.id]: firstParagraphAnchor },
    activeAnchorId,
  });
  writeStoredArtifacts({
    artifactsByAnchorId: { [firstParagraphAnchor.id]: artifacts },
    tasksByRequestId: {},
  });
}

function writeMixedOutputsForFirstParagraph() {
  const explanation = {
    id: 'later-explanation',
    documentId: journeyDocument.id,
    anchorId: firstParagraphAnchor.id,
    type: 'explanation' as const,
    title: 'Explanation',
    content: 'A later explanation of the paragraph.',
    status: 'complete' as const,
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  };
  const closeReading = createCloseReading(
    'earlier-close-reading',
    'Close Read Paragraph',
    'The earlier close reading is still valuable.',
    '2026-07-21T09:00:00.000Z',
  );

  writeFirstParagraphArtifacts([explanation, closeReading], null);
}

describe('close reading user journeys', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    writeStoredDocument(journeyDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns to an earlier paragraph analysis after focusing and reading another paragraph', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createCloseReadingResponse('Analysis of the first paragraph.'))
      .mockResolvedValueOnce(createCloseReadingResponse('Analysis of the second paragraph.'));
    vi.stubGlobal('fetch', fetchMock);
    renderWorkspace();

    await user.click(screen.getAllByRole('button', { name: 'Close read paragraph' })[0]);
    expect(await screen.findByText('Analysis of the first paragraph.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Focus analysis' }));
    const focusDialog = screen.getByRole('dialog', { name: 'Close reading focus' });
    expect(within(focusDialog).getByText('Analysis of the first paragraph.')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Close reading focus' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Close read paragraph' })[1]);
    expect(await screen.findByText('Analysis of the second paragraph.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open saved selection' }));
    expect(await screen.findByText('Analysis of the first paragraph.')).toBeInTheDocument();
    expect(screen.queryByText('Analysis of the second paragraph.')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('reopens a saved close reading after a newer explanation replaced it', async () => {
    const user = userEvent.setup();
    writeMixedOutputsForFirstParagraph();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    await user.click(screen.getByRole('button', {
      name: 'First paragraph for close reading.',
    }));

    const contextPanel = screen.getByRole('complementary', { name: 'Context panel' });
    expect(within(contextPanel).getByText('A later explanation of the paragraph.'))
      .toBeInTheDocument();
    await user.click(within(contextPanel).getByRole('button', { name: 'Open output history' }));
    await user.click(screen.getByRole('menuitem', { name: /Close Reading/ }));

    const closeReadingPane = screen.getByRole('complementary', { name: 'Close reading' });
    expect(within(closeReadingPane).getByText('The earlier close reading is still valuable.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Context panel' }))
      .not.toBeInTheDocument();
  });

  it('keeps an earlier output selected while entering and leaving focus mode', async () => {
    const user = userEvent.setup();
    const latestReading = createCloseReading(
      'latest-close-reading',
      'Latest reading',
      'Latest version of the close reading.',
      '2026-07-21T11:00:00.000Z',
    );
    const earlierReading = createCloseReading(
      'earlier-close-reading',
      'Earlier reading',
      'Earlier version worth comparing.',
      '2026-07-21T09:00:00.000Z',
    );
    writeFirstParagraphArtifacts(
      [latestReading, earlierReading],
      firstParagraphAnchor.id,
    );
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    expect(screen.getByText('Latest version of the close reading.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Focus analysis' }));
    await user.click(screen.getByRole('button', { name: 'Open Close Reading outputs' }));
    await user.click(screen.getByRole('menuitem', { name: /Earlier reading/ }));

    const focusDialog = screen.getByRole('dialog', { name: 'Close reading focus' });
    expect(within(focusDialog).getByText('Earlier version worth comparing.'))
      .toBeInTheDocument();
    await user.keyboard('{Escape}');

    const closeReadingPane = screen.getByRole('complementary', { name: 'Close reading' });
    expect(within(closeReadingPane).getByText('Earlier version worth comparing.'))
      .toBeInTheDocument();
    expect(screen.queryByText('Latest version of the close reading.'))
      .not.toBeInTheDocument();
  });

  it('recovers an interrupted close reading as retryable after a page reload', async () => {
    const user = userEvent.setup();
    const interruptedReading: Artifact = {
      ...createCloseReading(
        'interrupted-close-reading',
        'Interrupted reading',
        'Partial close reading output.',
        '2026-07-21T12:00:00.000Z',
      ),
      status: 'running',
      requestId: 'request-before-reload',
    };
    writeFirstParagraphArtifacts(
      [interruptedReading],
      firstParagraphAnchor.id,
    );
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    const closeReadingPane = screen.getByRole('complementary', { name: 'Close reading' });

    expect(within(closeReadingPane).getByText('stopped')).toBeInTheDocument();
    expect(within(closeReadingPane).getByRole('button', { name: 'Retry artifact' }))
      .toBeEnabled();
    expect(within(closeReadingPane).queryByRole('button', { name: 'Stop artifact' }))
      .not.toBeInTheDocument();
  });

  it('returns to a saved close reading after leaving it on mobile', async () => {
    const user = userEvent.setup();
    window.innerWidth = 390;
    const savedReading = createCloseReading(
      'mobile-close-reading',
      'Mobile reading',
      'A close reading saved on mobile.',
      '2026-07-21T13:00:00.000Z',
    );
    writeFirstParagraphArtifacts([savedReading], firstParagraphAnchor.id);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    expect(screen.getByRole('dialog', { name: 'Close reading' })).toBeInTheDocument();
    expect(screen.getByText('A close reading saved on mobile.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to text' }));
    expect(screen.queryByRole('dialog', { name: 'Close reading' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    expect(screen.getByRole('dialog', { name: 'Close reading' })).toBeInTheDocument();
    expect(screen.getByText('A close reading saved on mobile.')).toBeInTheDocument();
  });

  it('keeps overlapping paragraph streams attached to their original sources', async () => {
    const user = userEvent.setup();
    const encoder = new TextEncoder();
    const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetchMock = vi.fn().mockImplementation(() => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controllers.push(controller);
        },
      });
      return Promise.resolve(new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderWorkspace();

    await user.click(screen.getAllByRole('button', { name: 'Close read paragraph' })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getAllByRole('button', { name: 'Close read paragraph' })[1]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      controllers[0].enqueue(encoder.encode(
        'event: chunk\ndata: {"delta":"First stream result."}\n\n'
        + 'event: done\ndata: {"result":"First stream result."}\n\n',
      ));
      controllers[0].close();
    });
    expect(screen.queryByText('First stream result.')).not.toBeInTheDocument();

    await act(async () => {
      controllers[1].enqueue(encoder.encode(
        'event: chunk\ndata: {"delta":"Second stream result."}\n\n'
        + 'event: done\ndata: {"result":"Second stream result."}\n\n',
      ));
      controllers[1].close();
    });
    expect(await screen.findByText('Second stream result.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open saved selection' }));
    expect(await screen.findByText('First stream result.')).toBeInTheDocument();
    expect(screen.queryByText('Second stream result.')).not.toBeInTheDocument();
  });

  it('keeps source and Close Reading fonts independent while sharing size and spacing', async () => {
    const user = userEvent.setup();
    const savedReading = createCloseReading(
      'typography-close-reading',
      'Typography reading',
      'Typography comparison close reading.',
      '2026-07-21T14:00:00.000Z',
    );
    writeFirstParagraphArtifacts([savedReading], firstParagraphAnchor.id);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    const sourceArticle = screen.getByText(firstParagraphQuote).closest('article');
    const closeReadingBody = screen
      .getByText('Typography comparison close reading.')
      .closest('.close-reading-prose');

    expect(sourceArticle).toHaveStyle({ fontSize: '18px', lineHeight: '1.75' });
    expect(closeReadingBody).toHaveStyle({ fontSize: '16px', lineHeight: '1.75' });
    expect(sourceArticle).toHaveClass('font-serif');
    expect(closeReadingBody).toHaveClass('font-sans');

    await user.click(screen.getByRole('button', { name: 'Reading settings' }));
    await user.click(screen.getByRole('menuitem', { name: 'Text size: Large' }));
    expect(sourceArticle).toHaveStyle({ fontSize: '20px' });
    expect(closeReadingBody).toHaveStyle({ fontSize: '18px' });

    await user.click(screen.getByRole('menuitem', { name: 'Source font: Mono' }));
    expect(sourceArticle).toHaveClass('font-mono');
    expect(closeReadingBody).toHaveClass('font-sans');

    await user.click(screen.getByRole('menuitem', { name: 'Close Reading font: Serif' }));
    expect(sourceArticle).toHaveClass('font-mono');
    expect(closeReadingBody).toHaveClass('font-serif');

    await user.click(screen.getByRole('menuitem', { name: 'Line spacing: Compact' }));
    expect(closeReadingBody).toHaveStyle({ lineHeight: '1.5' });
    await user.click(screen.getByRole('menuitem', { name: 'Text size: Small' }));
    expect(sourceArticle).toHaveStyle({ fontSize: '16px' });
    expect(closeReadingBody).toHaveStyle({ fontSize: '15px' });
  });

  it('switches and deletes selection outputs without stacking their full history', async () => {
    const user = userEvent.setup();
    const latestExplanation: Artifact = {
      id: 'latest-selection-explanation',
      documentId: journeyDocument.id,
      anchorId: savedSelectionAnchor.id,
      type: 'explanation',
      title: 'Explanation',
      content: 'Latest explanation for the saved selection.',
      status: 'complete',
      createdAt: '2026-07-21T12:00:00.000Z',
      updatedAt: '2026-07-21T12:00:00.000Z',
    };
    const earlierTranslation: Artifact = {
      ...latestExplanation,
      id: 'earlier-selection-translation',
      type: 'translation',
      title: 'Translation',
      content: 'Earlier translation for the saved selection.',
      createdAt: '2026-07-21T11:00:00.000Z',
      updatedAt: '2026-07-21T11:00:00.000Z',
    };
    writeStoredAnchors({
      anchorsById: {
        [savedSelectionAnchor.id]: savedSelectionAnchor,
        [secondSelectionAnchor.id]: secondSelectionAnchor,
        [firstParagraphAnchor.id]: firstParagraphAnchor,
      },
      activeAnchorId: savedSelectionAnchor.id,
    });
    writeStoredArtifacts({
      artifactsByAnchorId: {
        [savedSelectionAnchor.id]: [latestExplanation, earlierTranslation],
        [firstParagraphAnchor.id]: [createCloseReading(
          'grouped-close-reading',
          'Grouped Close Reading',
          'Grouped Close Reading output.',
          '2026-07-21T10:00:00.000Z',
        )],
      },
      tasksByRequestId: {},
    });
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    const contextPanel = screen.getByRole('complementary', { name: 'Context panel' });
    expect(within(contextPanel).getByText(latestExplanation.content)).toBeInTheDocument();
    expect(within(contextPanel).queryByText(earlierTranslation.content)).not.toBeInTheDocument();

    await user.click(within(contextPanel).getByRole('button', { name: 'Open output history' }));
    await user.click(screen.getByRole('menuitem', { name: /Translation/ }));
    expect(within(contextPanel).getByText(earlierTranslation.content)).toBeInTheDocument();
    expect(within(contextPanel).queryByText(latestExplanation.content)).not.toBeInTheDocument();

    await user.click(within(contextPanel).getByRole('button', {
      name: 'Delete Translation output',
    }));
    expect(screen.getByRole('dialog', { name: 'Delete output?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete output' }));
    expect(within(contextPanel).getByText(latestExplanation.content)).toBeInTheDocument();
    expect(readStoredArtifacts().artifactsByAnchorId[savedSelectionAnchor.id]).toHaveLength(1);

    await user.click(within(contextPanel).getByRole('button', { name: 'Close active selection' }));
    expect(within(contextPanel).getByRole('heading', { name: 'Saved selections · 2' }))
      .toBeInTheDocument();
    expect(within(contextPanel).getByRole('heading', { name: 'Close Read sources · 1' }))
      .toBeInTheDocument();

    await user.click(within(contextPanel).getByRole('button', {
      name: `Delete saved selection: ${savedSelectionAnchor.quote}`,
    }));
    expect(screen.getByText('This permanently removes this selection and 1 attached output.'))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete selection' }));
    expect(readStoredAnchors().anchorsById[savedSelectionAnchor.id]).toBeUndefined();
    expect(readStoredArtifacts().artifactsByAnchorId[savedSelectionAnchor.id]).toBeUndefined();
    expect(within(contextPanel).getByRole('heading', { name: 'Saved selections · 1' }))
      .toBeInTheDocument();
  });

  it('deletes one Close Reading revision and returns to the remaining version', async () => {
    const user = userEvent.setup();
    const latestReading = createCloseReading(
      'managed-latest-reading',
      'Latest managed reading',
      'Latest managed Close Reading.',
      '2026-07-21T15:00:00.000Z',
    );
    const earlierReading = createCloseReading(
      'managed-earlier-reading',
      'Earlier managed reading',
      'Earlier managed Close Reading.',
      '2026-07-21T14:00:00.000Z',
    );
    writeFirstParagraphArtifacts([latestReading, earlierReading], firstParagraphAnchor.id);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    await user.click(screen.getByRole('button', { name: 'Open Close Reading outputs' }));
    await user.click(screen.getByRole('menuitem', { name: /Earlier managed reading/ }));
    expect(screen.getByText(earlierReading.content)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Close Reading' }));
    await user.click(screen.getByRole('button', { name: 'Delete output' }));
    expect(screen.getByText(latestReading.content)).toBeInTheDocument();
    expect(screen.queryByText(earlierReading.content)).not.toBeInTheDocument();
    expect(readStoredArtifacts().artifactsByAnchorId[firstParagraphAnchor.id]).toHaveLength(1);
  });
});
