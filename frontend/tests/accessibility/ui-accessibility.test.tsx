import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { RouteAccessibility } from '@/app/RouteAccessibility';
import { SettingsPage, useSettingsPage } from '@/pages/settings';
import { WorkspacePage } from '@/pages/workspace';
import { UserSettingsProvider } from '@/features/user-settings';

function SettingsHarness() {
  const settings = useSettingsPage();
  return <SettingsPage settings={settings} />;
}

function renderSettings() {
  return render(
    <UserSettingsProvider>
      <SettingsHarness />
    </UserSettingsProvider>,
  );
}

function RouteFixture() {
  return (
    <>
      <RouteAccessibility />
      <Link to="/app/settings">Settings</Link>
      <Routes>
        <Route path="/app" element={<main data-route-focus tabIndex={-1}>LogosAI</main>} />
        <Route path="/app/settings" element={<main data-route-focus tabIndex={-1}>Settings</main>} />
      </Routes>
    </>
  );
}

describe('UI accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const hasApiKey = init?.method === 'PUT';
      return new Response(JSON.stringify({
        settings: {
          model: 'gemini-2.5-flash',
          hasApiKey,
          apiKeyHint: hasApiKey ? '•••• alue' : null,
          updatedAt: hasApiKey ? '2026-08-09T12:00:00.000Z' : null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
  });

  it('associates settings controls and focuses an invalid API key field', async () => {
    const user = userEvent.setup();
    renderSettings();

    const apiKeyInput = screen.getByLabelText('API key');
    expect(apiKeyInput).toHaveAttribute('aria-describedby', 'settings-api-key-help');
    expect(screen.getByLabelText('Model')).toHaveAttribute('id', 'settings-model');

    const saveButton = screen.getByRole('button', { name: 'Loading settings…' });
    await waitFor(() => expect(saveButton).toHaveAccessibleName('Save settings'));
    await user.click(saveButton);

    await waitFor(() => expect(apiKeyInput).toHaveFocus());
    expect(apiKeyInput).toHaveAttribute('aria-invalid', 'true');
    expect(apiKeyInput).toHaveAccessibleDescription(/Enter your Gemini API key/);
  });

  it('keeps the settings success announcement available to assistive technology', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByRole('button', { name: 'Save settings' });
    await user.type(screen.getByLabelText('API key'), 'test-key-value');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(screen.getByRole('status')).toHaveTextContent('Settings saved successfully.');
  });

  it('removes the programmatically opened file input from the tab order', () => {
    render(
      <MemoryRouter>
        <WorkspacePage userId="test-user" hasApiKey={false} model="gemini-2.5-flash" />
      </MemoryRouter>,
    );

    expect(document.querySelector('input[type="file"]')).toHaveAttribute('hidden');
  });

  it('updates the document title and focuses the next route main content', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(
      <MemoryRouter initialEntries={['/app']}>
        <RouteFixture />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Settings' }));

    expect(document.title).toBe('Settings | LogosAI');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
