import { describe, expect, it } from 'vitest';
import type { TextAnchor } from '@/features/anchors';
import type { ArtifactStorageState } from '@/features/artifacts';
import {
  getAnchorMarkStatusById,
  getSessionArtifacts,
} from '@/pages/workspace/workspace-selectors';

const ANCHORS: TextAnchor[] = [
  {
    id: 'anchor-1',
    documentId: 'document-1',
    scope: 'selection',
    quote: 'First',
    normalizedQuote: 'First',
    quoteHash: 'first',
    startOffset: 0,
    endOffset: 5,
    createdAt: '2026-08-24T10:00:00.000Z',
  },
  {
    id: 'anchor-2',
    documentId: 'document-1',
    scope: 'selection',
    quote: 'Second',
    normalizedQuote: 'Second',
    quoteHash: 'second',
    startOffset: 6,
    endOffset: 12,
    createdAt: '2026-08-24T10:01:00.000Z',
  },
];

const STORAGE: ArtifactStorageState = {
  artifactsByAnchorId: {
    'anchor-1': [{
      id: 'artifact-1',
      documentId: 'document-1',
      anchorId: 'anchor-1',
      type: 'explanation',
      title: 'Explanation',
      content: 'Saved output',
      status: 'complete',
      createdAt: '2026-08-24T10:02:00.000Z',
      updatedAt: '2026-08-24T10:02:00.000Z',
    }],
    'anchor-2': [{
      id: 'artifact-2',
      documentId: 'document-1',
      anchorId: 'anchor-2',
      type: 'note',
      title: 'Note',
      content: 'Draft note',
      status: 'draft',
      createdAt: '2026-08-24T10:03:00.000Z',
      updatedAt: '2026-08-24T10:03:00.000Z',
    }],
  },
  tasksByRequestId: {},
};

describe('workspace selectors', () => {
  it('projects active, draft, and saved anchor mark states', () => {
    expect(getAnchorMarkStatusById({
      anchors: ANCHORS,
      activeAnchorId: 'anchor-1',
      artifactStorage: STORAGE,
    })).toEqual({
      'anchor-1': 'active',
      'anchor-2': 'draft',
    });
  });

  it('returns current-document artifacts newest first', () => {
    const anchorsById = Object.fromEntries(ANCHORS.map((anchor) => [anchor.id, anchor]));

    expect(getSessionArtifacts(STORAGE, anchorsById, 'document-1')
      .map(({ artifact }) => artifact.id))
      .toEqual(['artifact-2', 'artifact-1']);
    expect(getSessionArtifacts(STORAGE, anchorsById, undefined)).toEqual([]);
  });
});
