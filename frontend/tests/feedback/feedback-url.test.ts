import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEEDBACK_FORM_URL,
  getFeedbackFormUrl,
} from '@/features/feedback';

describe('feedback form URL', () => {
  it('uses the Tally form and records the page source', () => {
    expect(getFeedbackFormUrl('workspace', DEFAULT_FEEDBACK_FORM_URL)).toBe(
      'https://tally.so/r/68E7VP?source=workspace',
    );
    expect(getFeedbackFormUrl('landing', DEFAULT_FEEDBACK_FORM_URL)).toBe(
      'https://tally.so/r/68E7VP?source=landing',
    );
  });

  it('preserves other query params when adding source', () => {
    expect(getFeedbackFormUrl('auth', 'https://tally.so/r/68E7VP?foo=1')).toBe(
      'https://tally.so/r/68E7VP?foo=1&source=auth',
    );
  });
});
