import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import { scrubErrorEvent } from '@/monitoring/sentry';

describe('scrubErrorEvent', () => {
  it('removes user identity and private request content recursively', () => {
    const event = {
      type: undefined,
      user: { email: 'reader@example.com' },
      request: {
        cookies: { session: 'secret' },
        data: { text: 'private source' },
        headers: {
          Authorization: 'Bearer secret',
          'X-Gemini-Key': 'gemini-secret',
        },
        query_string: 'document=private',
      },
      extra: {
        document: { text: 'private source' },
        safe_counter: 2,
      },
    } satisfies ErrorEvent;

    expect(scrubErrorEvent(event)).toEqual({
      type: undefined,
      request: {
        headers: {
          Authorization: '[Filtered]',
          'X-Gemini-Key': '[Filtered]',
        },
      },
      extra: {
        document: '[Filtered]',
        safe_counter: 2,
      },
    });
  });
});
