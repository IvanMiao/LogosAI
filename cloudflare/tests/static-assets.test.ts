import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { CloudflareBindings } from '../src/env';

function createBindings(assets: Fetcher): CloudflareBindings {
  return {
    LOGOSAI_DB: {} as D1Database,
    ASSETS: assets,
    FASTAPI_ORIGIN: 'https://api.example.test',
    BETTER_AUTH_URL: 'https://logosai.example.test',
    BETTER_AUTH_SECRET: 'test-auth-secret',
    CREDENTIALS_ENCRYPTION_KEY: 'test-encryption-key',
    TRUSTED_ORIGINS: 'https://logosai.example.test',
  };
}

describe('Worker static assets', () => {
  it('serves SPA routes from the Assets binding', async () => {
    const fetchAsset = vi.fn(async () => new Response('<html>LogosAI</html>'));
    const assets = { fetch: fetchAsset } as unknown as Fetcher;

    const response = await createApp().request(
      'https://logosai.example.test/login',
      undefined,
      createBindings(assets),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('LogosAI');
    expect(fetchAsset).toHaveBeenCalledTimes(1);
  });

  it('does not send unknown API routes to the static app', async () => {
    const fetchAsset = vi.fn(async () => new Response('unexpected asset'));
    const assets = { fetch: fetchAsset } as unknown as Fetcher;

    const response = await createApp().request(
      'https://logosai.example.test/api/unknown',
      undefined,
      createBindings(assets),
    );

    expect(response.status).toBe(404);
    expect(fetchAsset).not.toHaveBeenCalled();
  });

  it('keeps missing asset-like paths as 404 responses', async () => {
    const fetchAsset = vi.fn(async () => new Response('unexpected asset'));
    const assets = { fetch: fetchAsset } as unknown as Fetcher;

    const response = await createApp().request(
      'https://logosai.example.test/assets/missing.js',
      undefined,
      createBindings(assets),
    );

    expect(response.status).toBe(404);
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
