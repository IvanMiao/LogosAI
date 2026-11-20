import { describe, expect, it } from 'vitest';
import { getLatestThoughtHeading } from '@/pages/workspace/components/artifact-thinking-helpers';

describe('latest thought heading', () => {
  it('extracts the last complete bold step heading', () => {
    expect(getLatestThoughtHeading('**Initiating Poetry Analysis**\nDetails\n\n**Examining Imagery**\nMore'))
      .toBe('Examining Imagery');
  });

  it('keeps the previous heading while a new heading is incomplete', () => {
    expect(getLatestThoughtHeading('**First step**\nDetails\n**Next step')).toBe('First step');
  });

  it.each(['', 'No headings', 'An **inline phrase** is not a heading', '**unfinished', '****'])(
    'returns no title for %j', (text) => {
      expect(getLatestThoughtHeading(text)).toBeUndefined();
    },
  );

  it('trims heading whitespace and supports CRLF', () => {
    expect(getLatestThoughtHeading('  ** Latest step **\r\nDetails')).toBe('Latest step');
  });
});
