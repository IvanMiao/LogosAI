import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { writeStoredAnchors } from '@/features/anchors';
import { writeStoredArtifacts } from '@/features/artifacts';
import { WorkspacePage } from '@/pages/workspace';
import {
  DEFAULT_CLOSE_READING_SOURCE_WIDTH,
  readStoredCloseReadingSourceWidth,
  writeStoredDocument,
} from '@/pages/workspace/workspace-storage';
import { writeHistory } from '@/utils/historyStorage';

const workspaceDocument = {
  id: 'document-1',
  title: 'Workspace document',
  text: 'A calm reading surface.',
  sourceType: 'paste' as const,
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
};
const scrollIntoViewMock = vi.fn();

function writeCloseReadingArtifacts() {
  const anchor = {
    id: 'paragraph-anchor',
    documentId: workspaceDocument.id,
    scope: 'paragraph' as const,
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
  });
  writeStoredArtifacts({
    artifactsByAnchorId: { [anchor.id]: [latestArtifact, earlierArtifact] },
    tasksByRequestId: {},
  });
}

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <WorkspacePage apiKey="" hasApiKey={false} model="gemini-2.5-flash" />
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
    await user.click(screen.getByRole('menuitem', { name: 'My texts' }));
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

  it('renders a focused reader at mobile and desktop viewport widths', async () => {
    const user = userEvent.setup();
    const widths = [390, 1280];

    for (const width of widths) {
      window.innerWidth = width;
      writeStoredDocument(workspaceDocument);
      const { unmount } = renderWorkspace();

      expect(screen.getByRole('button', { name: /API key missing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open app menu' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Analysis language' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();
      expect(screen.queryByRole('complementary', { name: 'Context panel' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open context panel' }));
      expect(screen.getByRole('complementary', { name: 'Context panel' })).toBeInTheDocument();

      unmount();
    }
  });

  it('dismisses selection actions when the user clicks elsewhere', async () => {
    const user = userEvent.setup();
    writeStoredDocument(workspaceDocument);
    renderWorkspace();
    const sourceParagraph = screen.getByText(workspaceDocument.text);
    const selectionRange = {
      commonAncestorContainer: sourceParagraph.firstChild,
      getBoundingClientRect: () => ({ left: 120, top: 180 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => selectionRange,
      toString: () => 'calm reading',
    } as unknown as Selection);

    fireEvent.mouseUp(sourceParagraph);
    expect(screen.getAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    expect(screen.queryAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(0);

    fireEvent.mouseUp(sourceParagraph);
    expect(screen.getAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(2);
    await user.keyboard('{Escape}');
    expect(screen.queryAllByRole('toolbar', { name: 'Selection actions' })).toHaveLength(0);
  });

  it('opens paragraph Close Read as a primary reading pane', async () => {
    const user = userEvent.setup();
    window.innerWidth = 1280;
    writeStoredDocument(workspaceDocument);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close read paragraph' }));

    expect(screen.getByRole('complementary', { name: 'Close reading' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Context panel' })).not.toBeInTheDocument();
    expect(screen.getByText('Missing Gemini API key. Configure it in Settings.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open app menu' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Focus analysis' }));
    const focusDialog = screen.getByRole('dialog', { name: 'Close reading focus' });
    expect(within(focusDialog).getByRole('button', { name: 'Show source' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open app menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Analysis language' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Close reading focus' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus analysis' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Focus analysis' }));
    await user.click(within(
      screen.getByRole('dialog', { name: 'Close reading focus' }),
    ).getByRole('button', { name: 'Show source' }));
    expect(screen.getByRole('button', { name: 'Focus analysis' })).toBeInTheDocument();
    const sourceParagraph = within(
      screen.getByRole('region', { name: 'Reading surface' }),
    ).getByText(workspaceDocument.text);
    await waitFor(() => {
      expect(sourceParagraph.parentElement).toHaveClass('bg-secondary/10');
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('resizes the Close Reading split with the keyboard and remembers the ratio', async () => {
    const user = userEvent.setup();
    window.innerWidth = 1280;
    writeStoredDocument(workspaceDocument);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close read paragraph' }));
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
    writeStoredDocument(workspaceDocument);
    writeCloseReadingArtifacts();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Open context panel' }));
    const closeReadingPane = screen.getByRole('complementary', { name: 'Close reading' });
    const closeReadingContent = within(closeReadingPane).getByText('Latest close reading content.');
    expect(within(closeReadingPane).getByText('Paragraph')).toBeInTheDocument();
    expect(within(closeReadingPane).queryByText(workspaceDocument.text)).not.toBeInTheDocument();
    expect(within(closeReadingPane).queryByText('Latest reading')).not.toBeInTheDocument();
    expect(within(closeReadingPane).queryByText('complete')).not.toBeInTheDocument();
    expect(closeReadingContent.closest('.close-reading-prose')).toHaveClass('font-sans');
    expect(closeReadingContent.closest('.close-reading-prose')).toHaveStyle({
      fontSize: '16px',
      lineHeight: '1.75',
    });

    await user.click(screen.getByRole('button', { name: 'Open Close Reading outputs' }));
    await user.click(screen.getByRole('menuitem', { name: /Earlier reading/i }));
    expect(screen.getByText('Earlier close reading content.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy Close Reading' }));
    expect(screen.getByRole('button', { name: 'Close Reading copied' })).toBeInTheDocument();
  });

  it('opens paragraph Close Read as a full-screen mobile reading view', async () => {
    const user = userEvent.setup();
    window.innerWidth = 390;
    writeStoredDocument(workspaceDocument);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Close read paragraph' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Close reading' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to text' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
