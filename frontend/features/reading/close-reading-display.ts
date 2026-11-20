const DISPLAY_MARKER = /[`*]{0,2}\[\[(OVERVIEW|SYNTHESIS|P\d+)\]\]?[`*]{0,2}/g;
const PARTIAL_MARKER_AT_END = /[`*]{0,2}\[(?:\[([A-Z]*\d*)\]?)?$/;

export function formatCloseReadingTags(text: string): string {
  const formatted = text.replace(DISPLAY_MARKER, (_marker, tag: string) => {
    if (tag === 'OVERVIEW') return 'Overview';
    if (tag === 'SYNTHESIS') return 'Synthesis';
    return `¶${tag.slice(1)}`;
  });
  return formatted.replace(PARTIAL_MARKER_AT_END, (marker, tag = '') => (
    'OVERVIEW'.startsWith(tag) || 'SYNTHESIS'.startsWith(tag) || /^P\d*$/.test(tag)
      ? '' : marker
  ));
}
