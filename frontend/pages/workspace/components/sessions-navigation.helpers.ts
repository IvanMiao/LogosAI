import type { WorkspaceDocument } from '@/features/reading';

export function getSessionCountLabel(visibleCount: number, totalCount: number): string {
  if (visibleCount === totalCount) {
    return `${totalCount} ${totalCount === 1 ? 'session' : 'sessions'}`;
  }

  return `${visibleCount} of ${totalCount} sessions`;
}

function getTextMatchExcerpt(text: string, query: string): string {
  const matchIndex = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (matchIndex < 0) return '';

  const excerptStart = Math.max(0, matchIndex - 32);
  const excerptEnd = Math.min(text.length, matchIndex + query.length + 56);
  const excerpt = text.slice(excerptStart, excerptEnd).replace(/\s+/g, ' ').trim();
  return `${excerptStart > 0 ? '…' : ''}${excerpt}${excerptEnd < text.length ? '…' : ''}`;
}

export function getSearchContext(document: WorkspaceDocument, query: string): string {
  if (!query) return '';
  if (document.title.toLocaleLowerCase().includes(query)) return 'Title match';

  const excerpt = getTextMatchExcerpt(document.text, query);
  return excerpt ? `Text match: “${excerpt}”` : '';
}
