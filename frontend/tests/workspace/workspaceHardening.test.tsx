import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readStoredAnchors, writeStoredAnchors } from '@/features/anchors';
import { writeStoredArtifacts } from '@/features/artifacts';
import { WorkspacePage } from '@/pages/workspace';
import {
  DEFAULT_CLOSE_READING_SOURCE_WIDTH,
  readStoredCloseReadingSourceWidth,
  writeStoredDocument,
} from '@/features/reading/reading-storage';
import { writeHistory } from '@/utils/historyStorage';

const workspaceDocument = {
  id: 'document-1',
  title: 'Workspace document',
  text: 'A calm reading surface.',
  sourceType: 'paste' as const,
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
};
const TEST_USER_ID = 'test-user';
const scrollIntoViewMock = vi.fn();

function writeCloseReadingArtifacts() {
  const anchor = {
    id: 'document-anchor',
    documentId: workspaceDocument.id,
    scope: 'document' as const,
    quote: workspaceDocument.text,
    normalizedQuote: workspaceDocument.text.toLowerCase(),
    quoteHash: 'paragraph-hash',
    startOffset: 0,
    endOffset: workspaceDocument.text.length,
    createdAt: '2026-07-13T00:00:00.000Z',
  };
  const latestArtifact = {
    id: 'close-reading-latest',
    documentId: workspaceDocument.id,
    anchorId: anchor.id,
    type: 'close_read' as const,
    title: 'Latest reading',
    content: 'Latest close reading content.',
    status: 'complete' as const,
    createdAt: '2026-07-13T02:00:00.000Z',
    updatedAt: '2026-07-13T02:00:00.000Z',
  };
  const earlierArtifact = {
    ...latestArtifact,
    id: 'close-reading-earlier',
    title: 'Earlier reading',
    content: 'Earlier close reading content.',
    createdAt: '2026-07-13T01:00:00.000Z',
    updatedAt: '2026-07-13T01:00:00.000Z',
  };

  writeStoredAnchors({
    anchorsById: { [anchor.id]: anchor },
    activeAnchorId: anchor.id,
  }, TEST_USER_ID);
  writeStoredArtifacts({
    artifactsByAnchorId: { [anchor.id]: [latestArtifact, earlierArtifact] },
    tasksByRequestId: {},
  }, TEST_USER_ID);
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <WorkspacePage userId={TEST_USER_ID} hasApiKey={false} model="gemini-2.5-flash" />
    </MemoryRouter>,
  );
}

describe('workspace hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    scrollIntoViewMock.mockClear();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  it('opens legacy history as a workspace document', async () => {
    const user = userEvent.setup();
    writeHistory([
      {
        id: 1,
        prompt: 'A legacy source paragraph.',
        result: 'Legacy analysis result.',
        targetLanguage: 'EN',
      },
    ]);

    renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Open app menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Reading sessions' }));
    await user.click(screen.getByText('Legacy analyses · 1'));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    const readingSurface = screen.getByRole('region', { name: 'Reading surface' });
    expect(readingSurface).toBeInTheDocument();
    expect(within(readingSurface).getByText('A legacy source paragraph.')).toBeInTheDocument();
    expect(screen.getByText('History · 4 words')).toBeInTheDocument();
    expect(screen.queryByText(/chars/)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows only the import surface before a document is open', () => {
    renderWorkspace();

    expect(screen.getByRole('region', { name: 'Start with a text' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reading surface' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Context panel' })).not.toBeInTheDocument();
  });

  it('keeps pasted text available when browser storage fails', async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError');
    });
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Paste text' }));
    const pasteEditor = screen.getByPlaceholderText('Paste source text here...');
    await user.type(pasteEditor, 'Text that must not be lost.');
    await user.click(screen.getByRole('button', { name: 'Start reading' }));

    expect(screen.getByRole('alert')).toHaveTextContent('This change could not be saved');
    expect(pasteEditor).toHaveValue('Text that must not be lost.');
    expect(screen.queryByRole('region', { name: 'Reading surface' })).not.toBeInTheDocument();
    setItemSpy.mockRestore();
  });

  it('renders a focused reader at mobile and desktop viewport widths', async () => {
    const user = userEvent.setup();
    const widths = [390, 1280];

    for (const width of widths) {
      window.innerWidth = width;
      writeStoredDocument(workspaceDocument, TEST_USER_ID);
      const { unmount } = renderWorkspace();

      expect(screen.getByRole('button', { name: /API key missing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open app menu' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Analysis language' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Workspace mode' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'History' }));
      expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();

      unmount();
    }
  });

  it('dismisses selection actions when the user clicks elsewhere', async () => {
    const user = userEvent.setup();
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    renderWorkspace();
    const sourceParagraph = screen.getByText(workspaceDocument.text);
    const selectionRange = {
      commonAncestorContainer: sourceParagraph.firstChild,
      startContainer: sourceParagraph.firstChild,
      startOffset: 2,
      endContainer: sourceParagraph.firstChild,
      endOffset: 14,
      getBoundingClientRect: () => ({ left: 120, top: 180 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => selectionRange,
      toString: () => 'calm reading',
    } as unknown as Selection);

    fireEvent.mouseUp(sourceParagraph);
    expect(screen.getAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.queryAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Text' }));
    const restoredSourceParagraph = screen.getByText(workspaceDocument.text);
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => ({
        ...selectionRange,
        commonAncestorContainer: restoredSourceParagraph.firstChild,
        startContainer: restoredSourceParagraph.firstChild,
        endContainer: restoredSourceParagraph.firstChild,
      }),
      toString: () => 'calm reading',
    } as unknown as Selection);
    fireEvent.mouseUp(restoredSourceParagraph);
    expect(screen.getAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(2);
    await user.keyboard('{Escape}');
    expect(screen.queryAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(0);
  });

  it('keeps Close Reading open until a selection action is confirmed', async () => {
    const user = userEvent.setup();
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    writeCloseReadingArtifacts();
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Close Reading' }));
    expect(screen.getByText('Latest close reading content.')).toBeInTheDocument();

    const sourceParagraph = screen.getByText(workspaceDocument.text);
    const selectionRange = {
      commonAncestorContainer: sourceParagraph.firstChild,
      startContainer: sourceParagraph.firstChild,
      startOffset: 2,
      endContainer: sourceParagraph.firstChild,
      endOffset: 14,
      getBoundingClientRect: () => ({ left: 120, top: 180 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => selectionRange,
      toString: () => 'calm reading',
    } as unknown as Selection);

    fireEvent.mouseUp(sourceParagraph);

    expect(screen.getByText('Latest close reading content.')).toBeInTheDocument();
    expect(Object.keys(readStoredAnchors(TEST_USER_ID).anchorsById)).toEqual([
      'document-anchor',
    ]);

    await user.click(screen.getAllByRole('button', { name: 'Explain' })[0]);
    await waitFor(() => expect(Object.keys(readStoredAnchors(TEST_USER_ID).anchorsById))
      .toHaveLength(2));
  });

  it('opens paragraph Explain without creating a Close Reading', async () => {
    const user = userEvent.setup();
    window.innerWidth = 1280;
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Explain paragraph' }));

    expect(screen.getByRole('complementary', { name: 'Current explanation' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Close reading' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Gemini API key missing');
    expect(screen.getByRole('button', { name: 'Open app menu' })).toBeInTheDocument();
    expect(Object.values(readStoredAnchors(TEST_USER_ID).anchorsById))
      .toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'paragraph' })]));
  });

  it('resizes the Close Reading split with the keyboard and remembers the ratio', async () => {
    const user = userEvent.setup();
    window.innerWidth = 1280;
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    writeCloseReadingArtifacts();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close Reading' }));
    const separator = screen.getByRole('separator', {
      name: 'Resize source and Close Reading panes',
    });

    expect(separator).toHaveAttribute('aria-valuenow', String(DEFAULT_CLOSE_READING_SOURCE_WIDTH));
    await user.type(separator, '{ArrowRight}');
    expect(separator).toHaveAttribute('aria-valuenow', '43');
    expect(readStoredCloseReadingSourceWidth()).toBe(43);

    await user.type(separator, '{Home}');
    expect(separator).toHaveAttribute('aria-valuenow', '30');
  });

  it('navigates and copies Close Reading outputs for the active source', async () => {
    const user = userEvent.setup();
    window.innerWidth = 1280;
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    writeCloseReadingArtifacts();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close Reading' }));
    const closeReadingPane = screen.getByRole('complementary', { name: 'Close reading' });
    const closeReadingContent = within(closeReadingPane).getByText('Latest close reading content.');
    expect(within(closeReadingPane).getByText('Document')).toBeInTheDocument();
    expect(within(closeReadingPane).queryByText(workspaceDocument.text)).not.toBeInTheDocument();
    expect(within(closeReadingPane).queryByText('Latest reading')).not.toBeInTheDocument();
    expect(within(closeReadingPane).queryByText('complete')).not.toBeInTheDocument();
    expect(closeReadingContent.closest('.close-reading-prose')).toHaveClass('font-serif');
    expect(closeReadingContent.closest('.close-reading-prose')).toHaveStyle({
      fontSize: '18px',
      lineHeight: '1.75',
    });

    await user.click(screen.getByRole('button', { name: 'Open Close Reading outputs' }));
    await user.click(screen.getByRole('menuitem', { name: /Earlier reading/i }));
    expect(screen.getByText('Earlier close reading content.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy Close Reading' }));
    expect(screen.getByRole('button', { name: 'Close Reading copied' })).toBeInTheDocument();
  });

  it('opens whole-document Close Reading as a full-screen mobile reading view', async () => {
    const user = userEvent.setup();
    window.innerWidth = 390;
    writeStoredDocument(workspaceDocument, TEST_USER_ID);
    writeCloseReadingArtifacts();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close Reading' }));

    expect(screen.getByRole('complementary', { name: 'Close reading' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reading surface' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to text' }));
    expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();
  });
});
