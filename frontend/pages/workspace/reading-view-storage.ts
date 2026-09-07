type ViewValues = Record<string, unknown>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readingViewKey(userId: string, documentId: string): string {
  return `logosai.reading-view:v1:${encodeURIComponent(userId)}:${encodeURIComponent(documentId)}`;
}

export function createReadingViewStore(userId: string, onSaveError: (failed: boolean) => void) {
  const sessions = new Map<string, ViewValues>();

  const read = (documentId: string): ViewValues => {
    const cached = sessions.get(documentId);
    if (cached) return cached;
    let values: ViewValues = {};
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(readingViewKey(userId, documentId)) ?? 'null');
      if (isRecord(stored) && stored.version === 1 && isRecord(stored.values)) values = stored.values;
    } catch { /* Invalid or inaccessible snapshots never prevent reading content. */ }
    sessions.set(documentId, values);
    return values;
  };

  const write = (documentId: string, key: string, value: unknown): void => {
    const values = { ...read(documentId), [key]: value };
    sessions.set(documentId, values);
    try {
      localStorage.setItem(readingViewKey(userId, documentId), JSON.stringify({ version: 1, values }));
      onSaveError(false);
    } catch {
      onSaveError(true);
    }
  };

  return { read, write };
}

export type ReadingViewStore = ReturnType<typeof createReadingViewStore>;
