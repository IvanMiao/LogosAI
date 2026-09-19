import type { ReadingSessionSnapshot } from './reading-session-types';

/** Keep the complete local reading without reusing cloud-owned aggregate IDs. */
export function copyConflictingReading(session: ReadingSessionSnapshot): ReadingSessionSnapshot {
  const documentId = `document-${crypto.randomUUID()}`;
  const anchorIds = new Map(session.anchors.map((anchor) => [anchor.id, `anchor-${crypto.randomUUID()}`]));
  const now = new Date().toISOString();
  return {
    document: { ...session.document, id: documentId,
      title: `${session.document.title.slice(0, 140)} (conflict copy)`, updatedAt: now },
    activeAnchorId: anchorIds.get(session.activeAnchorId ?? '') ?? null,
    anchors: session.anchors.map((anchor) => ({ ...anchor, id: anchorIds.get(anchor.id)!, documentId })),
    artifacts: session.artifacts.map((artifact) => {
      const copy = { ...artifact, id: `artifact-${crypto.randomUUID()}`, documentId,
        anchorId: anchorIds.get(artifact.anchorId)!,
        status: artifact.status === 'running' ? 'stopped' as const : artifact.status };
      // A copied result is not another live task for the original request.
      delete copy.requestId;
      return copy;
    }),
  };
}
