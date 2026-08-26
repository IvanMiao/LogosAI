import { describe, expect, it } from 'vitest';
import {
  assertLoopbackBaseUrl,
  createAuthRequestHeaders,
  prepareWorkspaceFixture,
} from '../scripts/seed-local-test-account.mjs';

describe('local test account seeding guard', () => {
  it('allows only loopback application origins', () => {
    expect(assertLoopbackBaseUrl('http://localhost:5173')).toBe('http://localhost:5173');
    expect(assertLoopbackBaseUrl('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787');
    expect(() => assertLoopbackBaseUrl('https://logosai-cloud.ymiao.workers.dev'))
      .toThrow(/Refusing to seed a non-local origin/);
  });

  it('sends the trusted local app origin to Better Auth', () => {
    expect(createAuthRequestHeaders('http://localhost:5173')).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    });
    expect(() => createAuthRequestHeaders('https://logosai-cloud.ymiao.workers.dev'))
      .toThrow(/Refusing to seed a non-local origin/);
  });

  it('normalizes document anchors to the full seeded source', () => {
    const fixture = prepareWorkspaceFixture({
      preferences: {},
      session: {
        document: { text: 'A complete document.' },
        anchors: [{ scope: 'document', quote: 'placeholder', startOffset: 3, endOffset: 4 }],
      },
    });

    expect(fixture.session.anchors[0]).toMatchObject({
      quote: 'A complete document.',
      normalizedQuote: 'a complete document.',
      startOffset: 0,
      endOffset: 20,
    });
  });
});
