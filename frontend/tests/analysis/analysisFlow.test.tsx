import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisPage } from '@/pages/analysis';
import { readHistory, writeHistory } from '@/utils/historyStorage';

function renderAnalysisPage() {
  return render(
    <MemoryRouter>
      <AnalysisPage apiKey="test-key" hasApiKey model="gemini-2.5-flash" />
    </MemoryRouter>,
  );
}

function createSuccessfulStreamResponse(): Response {
  const body = [
    'event: stage\ndata: {"stage":"detect"}\n\n',
    'event: chunk\ndata: {"delta":"A clear "}\n\n',
    'event: stage\ndata: {"stage":"interpret"}\n\n',
    'event: chunk\ndata: {"delta":"analysis."}\n\n',
    'event: done\ndata: {"result":"A clear analysis."}\n\n',
  ].join('');

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('legacy analysis user flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('scrollTo', vi.fn());
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets a user submit source text and keeps the completed result in history', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(createSuccessfulStreamResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderAnalysisPage();

    await user.type(
      screen.getByRole('textbox', { name: 'RAW_CONTENT' }),
      'A difficult source paragraph.',
    );
    await user.click(screen.getByRole('button', { name: 'INITIATE_ANALYSIS' }));

    expect(await screen.findByText('A clear analysis.')).toBeInTheDocument();
    expect(screen.getByText('1 previous analysis')).toBeInTheDocument();
    expect(readHistory()).toEqual([
      expect.objectContaining({
        prompt: 'A difficult source paragraph.',
        result: 'A clear analysis.',
        targetLanguage: 'en',
      }),
    ]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      text: 'A difficult source paragraph.',
      user_language: 'en',
      model: 'gemini-2.5-flash',
    });
  });

  it('shows an API failure without adding a broken analysis to history', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: 'Analysis quota exhausted.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      },
    )));
    renderAnalysisPage();

    await user.type(
      screen.getByRole('textbox', { name: 'RAW_CONTENT' }),
      'Analyze this despite the exhausted quota.',
    );
    await user.click(screen.getByRole('button', { name: 'INITIATE_ANALYSIS' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Analysis quota exhausted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'INITIATE_ANALYSIS' })).toBeEnabled();
    expect(screen.getByText('No History Yet')).toBeInTheDocument();
    expect(readHistory()).toEqual([]);
  });

  it('lets a user inspect, restore, and delete a saved analysis', async () => {
    const user = userEvent.setup();
    writeHistory([
      {
        id: 42,
        prompt: 'A saved French source.',
        result: 'A saved interpretation.',
        targetLanguage: 'fr',
        timestamp: '2026-07-20T10:30:00.000Z',
      },
    ]);
    renderAnalysisPage();

    await user.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByText('A saved interpretation.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByRole('textbox', { name: 'RAW_CONTENT' })).toHaveValue(
      'A saved French source.',
    );
    expect(screen.getByRole('combobox', { name: 'TARGET_LANGUAGE' })).toHaveTextContent(
      'Français (French)',
    );

    await user.click(screen.getByRole('button', { name: 'Delete this analysis' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Analysis' });
    expect(within(dialog).getByText('A saved French source.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete Permanently' }));

    expect(await screen.findByText('No History Yet')).toBeInTheDocument();
    expect(readHistory()).toEqual([]);
  });
});
