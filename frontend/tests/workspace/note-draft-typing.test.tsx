import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspacePage } from '@/pages/workspace';

const sourceText = 'River water carries stones.';
const userId = 'note-draft-typing';

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <WorkspacePage userId={userId} hasApiKey={false} model="gemini-2.5-flash" />
    </MemoryRouter>,
  );
}

describe('note draft typing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.innerWidth = 1280;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the first note text in order while creating the draft', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.type(screen.getByRole('textbox', { name: 'Source text' }), sourceText);
    await user.click(screen.getByRole('button', { name: 'Start reading' }));

    const readingSurface = screen.getByRole('region', { name: 'Reading surface' });
    const paragraph = within(readingSurface).getByText(sourceText);
    const selectionRange = {
      commonAncestorContainer: paragraph.firstChild,
      startContainer: paragraph.firstChild,
      startOffset: 0,
      endContainer: paragraph.firstChild,
      endOffset: 5,
      getBoundingClientRect: () => ({ left: 120, top: 180 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => selectionRange,
      toString: () => 'River',
    } as unknown as Selection);
    fireEvent.mouseUp(paragraph);

    const toolbar = screen.getAllByRole('toolbar', { name: 'Selection actions' })[0];
    await user.click(within(toolbar).getByRole('button', { name: 'Note' }));
    const textarea = await screen.findByPlaceholderText('Write a note attached to this source…');
    await user.type(textarea, 'River note alpha');

    expect(screen.getByPlaceholderText('Write a note attached to this source…'))
      .toHaveValue('River note alpha');
  });
});
