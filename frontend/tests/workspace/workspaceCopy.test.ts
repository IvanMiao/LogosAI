import { describe, expect, it } from 'vitest';
import { getStageLabel } from '@/pages/workspace/workspace-copy';

describe('getStageLabel', () => {
  it('maps backend pipeline stages to reader-facing wording', () => {
    expect(getStageLabel('detect')).toBe('Reading the language and genre…');
    expect(getStageLabel('correct')).toBe('Cleaning up the source text…');
    expect(getStageLabel('interpret')).toBe('Writing the explanation…');
  });

  it('returns nothing for an unknown or empty stage so the caller can keep its fallback', () => {
    expect(getStageLabel(undefined)).toBeUndefined();
    expect(getStageLabel('')).toBeUndefined();
    expect(getStageLabel('unknown-stage')).toBeUndefined();
  });
});
