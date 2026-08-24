import { describe, expect, it } from 'vitest';
import { ReadingSessionSnapshotSchema } from '../src/reading/reading-schema';

const NOW = '2026-08-09T12:00:00.000Z';

function createSnapshot() {
  return {
    document: {
      id: 'document-1',
      title: 'A difficult text',
      text: 'A difficult sentence.',
      sourceType: 'paste',
      createdAt: NOW,
      updatedAt: NOW,
    },
    activeAnchorId: 'anchor-1',
    anchors: [{
      id: 'anchor-1',
      documentId: 'document-1',
      scope: 'selection',
      quote: 'difficult sentence',
      normalizedQuote: 'difficult sentence',
      quoteHash: 'hash',
      startOffset: 2,
      endOffset: 20,
      createdAt: NOW,
    }],
    artifacts: [{
      id: 'artifact-1',
      documentId: 'document-1',
      anchorId: 'anchor-1',
      type: 'note',
      title: 'Note',
      content: 'Revisit this image.',
      status: 'draft',
      createdAt: NOW,
      updatedAt: NOW,
    }],
  };
}

describe('reading session validation', () => {
  it('accepts a coherent session aggregate', () => {
    expect(ReadingSessionSnapshotSchema.safeParse(createSnapshot()).success).toBe(true);
  });

  it('rejects an artifact attached to another session', () => {
    const snapshot = createSnapshot();
    snapshot.artifacts[0].documentId = 'document-2';

    expect(ReadingSessionSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
});
