import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSettingsProvider } from '@/features/user-settings';
import { SettingsPage, useSettingsPage } from '@/pages/settings';

function SettingsHarness() {
  const settings = useSettingsPage();
  return <SettingsPage settings={settings} />;
}

const scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
afterEach(() => {
  vi.unstubAllGlobals();
  if (scrollIntoView) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

describe('model settings', () => {
  it('selects, saves, and reloads Gemini 4 Argon using its API model ID', async () => {
    // JSDOM does not implement the browser scrolling API used by Radix Select.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    let model = 'gemini-2.5-flash';
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') model = JSON.parse(init.body as string).model;
      return Response.json({
        settings: { model, hasApiKey: true, apiKeyHint: '•••• test', updatedAt: null },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const view = render(<UserSettingsProvider><SettingsHarness /></UserSettingsProvider>);
    await screen.findByRole('button', { name: 'Save settings' });
    const select = screen.getByRole('combobox', { name: 'Model' });
    select.focus();
    await user.keyboard(' ');
    await user.click(await screen.findByRole('option', { name: 'Gemini 4 Argon' }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Settings saved.');
    expect(fetchMock).toHaveBeenCalledWith('/api/account/settings', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ model: 'gemini-4-argon' }),
    }));
    view.unmount();
    render(<UserSettingsProvider><SettingsHarness /></UserSettingsProvider>);
    await screen.findByRole('button', { name: 'Save settings' });
    expect(screen.getByRole('combobox', { name: 'Model' })).toHaveTextContent('Gemini 4 Argon');
  });
});
