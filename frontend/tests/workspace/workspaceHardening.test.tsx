import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePage } from '@/pages/workspace';
import { writeHistory } from '@/utils/historyStorage';

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
    await user.click(screen.getByRole('button', { name: 'Open legacy history' }));
    await user.click(screen.getByRole('button', { name: 'Open as document' }));

    expect(screen.getAllByText('A legacy source paragraph.')).toHaveLength(2);
    expect(screen.getByText(/Legacy history/)).toBeInTheDocument();
  });

  it('renders stable controls at mobile and desktop viewport widths', () => {
    const widths = [390, 1280];

    for (const width of widths) {
      window.innerWidth = width;
      const { unmount } = renderWorkspace();

      expect(screen.getByRole('button', { name: /API key missing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open legacy history' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Reading surface' })).toBeInTheDocument();

      unmount();
    }
  });
});
