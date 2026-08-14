import { describe, expect, it } from 'vitest';
import { isForwardedAiPath } from '../src/gateway/ai-gateway';

describe('AI gateway path allowlist', () => {
  it('allows only the existing FastAPI analysis contracts', () => {
    expect(isForwardedAiPath('/api/analyze/stream')).toBe(true);
    expect(isForwardedAiPath('/api/anchors/run')).toBe(true);
    expect(isForwardedAiPath('/api/admin')).toBe(false);
  });
});
