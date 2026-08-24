import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RemoteApiError,
  reportUnexpectedApiError,
} from '@/client-api/api-error';
import { reportUnexpectedError } from '@/monitoring/sentry';

vi.mock('@/monitoring/sentry', () => ({
  reportUnexpectedError: vi.fn(),
}));

describe('reportUnexpectedApiError', () => {
  beforeEach(() => {
    vi.mocked(reportUnexpectedError).mockClear();
  });

  it('reports unexpected client failures with a safe operation tag', () => {
    const error = new TypeError('Failed to fetch');

    reportUnexpectedApiError(error, 'stream_analysis');

    expect(reportUnexpectedError).toHaveBeenCalledWith(error, {
      operation: 'stream_analysis',
    });
  });

  it('does not report errors already reported by the backend', () => {
    reportUnexpectedApiError(new RemoteApiError('Backend failed'), 'run_anchor_skill');

    expect(reportUnexpectedError).not.toHaveBeenCalled();
  });

  it('does not report intentional request cancellation', () => {
    reportUnexpectedApiError(new DOMException('Cancelled', 'AbortError'), 'stream_analysis');

    expect(reportUnexpectedError).not.toHaveBeenCalled();
  });
});
