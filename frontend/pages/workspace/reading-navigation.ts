export function readingPath(documentId: string): string {
  return `/app/readings/${encodeURIComponent(documentId)}`;
}

export function documentIdFromPath(pathname: string): string | null {
  const match = /^\/app\/readings\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); }
  catch { return null; }
}
