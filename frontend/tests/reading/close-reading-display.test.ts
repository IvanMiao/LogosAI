import { describe, expect, it } from 'vitest';
import { formatCloseReadingTags } from '@/features/reading/close-reading-display';

describe('Close Reading display tags', () => {
  it('replaces inline and line-start tags', () => {
    expect(formatCloseReadingTags('[[OVERVIEW]]\nRefer to [[P3]] and [[SYNTHESIS]].'))
      .toBe('Overview\nRefer to ¶3 and Synthesis.');
  });

  it.each(['`[[P1]]`', '**[[P1]]**', '[P1]', '`[P1]`', '**[P1]**', '[[P1]'])(
    'removes tag wrappers from %s', (text) => {
      expect(formatCloseReadingTags(text)).toBe('¶1');
    },
  );

  it('removes wrappers from named tags', () => {
    expect(formatCloseReadingTags('`[[OVERVIEW]]`, **[[SYNTHESIS]]**, [OVERVIEW]'))
      .toBe('Overview, Synthesis, Overview');
  });

  it.each(['[[', '[[P', '[[P23', '`[[OVE', '**[[SYNTHES', '[P3'])(
    'hides an unfinished trailing tag %s', (partial) => {
      expect(formatCloseReadingTags(`Text ${partial}`)).toBe('Text ');
    },
  );

  it.each(['', '[[foo]]', '`[[foo]]`', '**[[foo]]**', '[[POEM]]', '[[P3ish]]', '[[FOO', '[[P3 in progress'])(
    'preserves non-tags %j', (text) => {
      expect(formatCloseReadingTags(text)).toBe(text);
    },
  );
});
