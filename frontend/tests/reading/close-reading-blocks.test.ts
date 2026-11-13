import { describe, expect, it } from 'vitest';
import { parseCloseReadingBlocks } from '@/features/reading/close-reading-blocks';

const aligned = '[[OVERVIEW]]\nIntro\n\n[[P1]]\nOne\n\n[[P2]]\nTwo\n\n[[SYNTHESIS]]\nEnd';
const alignedBlocks = [
  { kind: 'overview', content: 'Intro' },
  { kind: 'paragraph', paragraphNumber: 1, content: 'One' },
  { kind: 'paragraph', paragraphNumber: 2, content: 'Two' },
  { kind: 'synthesis', content: 'End' },
];

describe('parseCloseReadingBlocks', () => {
  it('splits an aligned reading into its tagged blocks', () => {
    expect(parseCloseReadingBlocks(aligned)).toEqual(alignedBlocks);
  });

  it.each([
    ['a missing closing bracket', aligned.replace('[[P1]]', '[[P1]')],
    ['a tag in backticks', aligned.replace('[[P2]]', '`[[P2]]`')],
    ['a bold tag', aligned.replace('[[OVERVIEW]]', '**[[OVERVIEW]]**')],
    ['commentary on the tag line', aligned.replace('[[P1]]\nOne', '[[P1]] One')],
  ])('tolerates %s while the reading is still streaming', (_name, content) => {
    expect(parseCloseReadingBlocks(content)).toEqual(alignedBlocks);
  });

  it('keeps text written before the first tag', () => {
    expect(parseCloseReadingBlocks(`Preface\n\n${aligned}`)?.[0])
      .toEqual({ kind: 'untagged', content: 'Preface' });
  });

  it('returns the blocks received so far for a partial stream', () => {
    expect(parseCloseReadingBlocks('[[OVERVIEW]]\nIntro\n\n[[P1]]\nOn')).toEqual([
      { kind: 'overview', content: 'Intro' },
      { kind: 'paragraph', paragraphNumber: 1, content: 'On' },
    ]);
  });

  it.each(['[', '[[', '[[P', '[[P2', '[[P2]', '`[[SYNTH'])(
    'hides the unfinished tag %s at the end of a stream',
    (partial) => {
      expect(parseCloseReadingBlocks(`[[OVERVIEW]]\nIntro\n\n[[P1]]\nOne\n\n${partial}`)).toEqual([
        { kind: 'overview', content: 'Intro' },
        { kind: 'paragraph', paragraphNumber: 1, content: 'One' },
      ]);
    },
  );

  it('shows nothing while the first tag is still arriving', () => {
    expect(parseCloseReadingBlocks('[[OVER')).toEqual([]);
  });

  it('returns null for a reading without tags', () => {
    expect(parseCloseReadingBlocks('# Legacy reading\n\nMentions `[[P1]]` inline.')).toBeNull();
  });
});
