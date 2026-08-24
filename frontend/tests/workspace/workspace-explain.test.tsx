import { act } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readStoredAnchors } from '@/features/anchors';
import { readStoredArtifacts } from '@/features/artifacts';
import { useWorkspace } from '@/pages/workspace/useWorkspace';
import { writeStoredDocument } from '@/features/reading/reading-storage';

const document = {
  id: 'document-1',
  title: 'Selection test',
  text: 'Alpha beta gamma.',
  sourceType: 'paste' as const,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};
const TEST_USER_ID = 'test-user';

function WorkspaceHarness() {
  const workspace = useWorkspace({
    userId: TEST_USER_ID,
    hasApiKey: true,
    model: 'gemini-2.5-flash',
  });

  return (
    <div>
      <p>Active: {workspace.activeAnchor?.quote ?? 'none'}</p>
      <button
        type="button"
        onClick={() => workspace.showSelectionActions({
          selectedText: 'beta',
          startOffset: 6,
          endOffset: 10,
        }, { top: 0, left: 0 })}
      >
        Select beta
      </button>
      <button
        type="button"
        onClick={() => workspace.showSelectionActions({
          selectedText: 'gamma',
          startOffset: 11,
          endOffset: 16,
        }, { top: 0, left: 0 })}
      >
        Select gamma
      </button>
      <button
        type="button"
        onClick={() => {
          void workspace.runAnchorSkillForPendingSelection('explain');
        }}
      >
        Explain
      </button>
      <button type="button" onClick={() => workspace.updateAnalysisLanguage('fr')}>
        Analyze in French
      </button>
    </div>
  );
}

describe('workspace anchored explain flow', () => {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  beforeEach(() => {
    localStorage.clear();
    writeStoredDocument(document, TEST_USER_ID);

    const stream = new ReadableStream<Uint8Array>({
      start(nextController) {
        controller = nextController;
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function enqueueSse(event: string, data: Record<string, unknown>) {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  }

  it('keeps streamed Explain output on the original anchor after selection changes', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    await user.click(screen.getByRole('button', { name: 'Select beta' }));
    expect(screen.getByText('Active: none')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyze in French' }));
    await user.click(screen.getByRole('button', { name: 'Explain' }));
    await screen.findByText('Active: beta');
    const anchorAId = readStoredAnchors(TEST_USER_ID).activeAnchorId;

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ user_language: 'fr' });

    await act(async () => {
      enqueueSse('stage', {
        request_id: 'request-a',
        trace_id: 'trace-a',
        anchor_id: anchorAId,
        stage: 'interpret',
      });
      enqueueSse('chunk', {
        request_id: 'request-a',
        trace_id: 'trace-a',
        anchor_id: anchorAId,
        delta: 'First ',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Select gamma' }));
    expect(screen.getByText('Active: beta')).toBeInTheDocument();
    expect(readStoredAnchors(TEST_USER_ID).anchorsById).toHaveProperty(anchorAId ?? '');

    await act(async () => {
      enqueueSse('chunk', {
        request_id: 'request-a',
        trace_id: 'trace-a',
        anchor_id: anchorAId,
        delta: 'second',
      });
      enqueueSse('done', {
        request_id: 'request-a',
        trace_id: 'trace-a',
        anchor_id: anchorAId,
        result: 'First second',
      });
      controller.close();
    });

    await waitFor(() => {
      const artifacts = readStoredArtifacts(TEST_USER_ID);
      const anchorArtifacts = artifacts.artifactsByAnchorId[anchorAId ?? ''] ?? [];
      expect(anchorArtifacts[0]?.content).toBe('First second');
      expect(anchorArtifacts[0]?.traceId).toBe('trace-a');
      expect(Object.keys(readStoredAnchors(TEST_USER_ID).anchorsById)).toHaveLength(1);
    });
  });
});
