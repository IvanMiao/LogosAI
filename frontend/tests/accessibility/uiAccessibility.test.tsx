import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { RouteAccessibility } from '@/app/RouteAccessibility';
import { SettingsPage, useSettingsPage } from '@/pages/settings';
import { WorkspacePage } from '@/pages/workspace';

function SettingsHarness() {
  const settings = useSettingsPage();
  return <SettingsPage settings={settings} />;
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
  });

  it('associates settings controls and focuses an invalid API key field', async () => {
    const user = userEvent.setup();
    render(<SettingsHarness />);

    const apiKeyInput = screen.getByLabelText('API Key');
    expect(apiKeyInput).toHaveAttribute('aria-describedby', 'settings-api-key-help');
    expect(screen.getByLabelText('Model')).toHaveAttribute('id', 'settings-model');

    await user.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => expect(apiKeyInput).toHaveFocus());
    expect(apiKeyInput).toHaveAttribute('aria-invalid', 'true');
    expect(apiKeyInput).toHaveAccessibleDescription(/Please enter your Gemini API key/);
  });

  it('keeps the settings success announcement available to assistive technology', async () => {
    const user = userEvent.setup();
    render(<SettingsHarness />);

    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.click(screen.getByRole('button', { name: 'Save Settings' }));

    expect(screen.getByRole('status')).toHaveTextContent('Settings saved successfully!');
  });

  it('removes the programmatically opened file input from the tab order', () => {
    render(
      <MemoryRouter>
        <WorkspacePage apiKey="" hasApiKey={false} model="gemini-2.5-flash" />
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
