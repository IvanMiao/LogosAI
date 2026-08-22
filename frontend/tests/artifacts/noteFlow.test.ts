import { describe, expect, it } from 'vitest';
import {
  completeNoteDraft,
  createEmptyArtifactStorage,
  getArtifactsForAnchor,
  getNoteDraft,
  removeArtifact,
  removeArtifactsForAnchor,
  removeArtifactsForDocument,
  upsertNoteDraft,
} from '@/features/artifacts';

describe('note artifact flow', () => {
  it('creates and updates a draft note for the same anchor', () => {
    const firstStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'First note',
    });
    const firstDraft = getNoteDraft(getArtifactsForAnchor(firstStorage, 'anchor-1'));

    const secondStorage = upsertNoteDraft({
      storage: firstStorage,
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'Updated note',
    });
    const secondDraft = getNoteDraft(getArtifactsForAnchor(secondStorage, 'anchor-1'));

    expect(firstDraft?.id).toBe(secondDraft?.id);
    expect(secondDraft?.content).toBe('Updated note');
  });

  it('keeps note drafts isolated by anchor', () => {
    const firstStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'First anchor note',
    });

    const secondStorage = upsertNoteDraft({
      storage: firstStorage,
      documentId: 'document-1',
      anchorId: 'anchor-2',
      content: 'Second anchor note',
    });

    expect(getNoteDraft(getArtifactsForAnchor(secondStorage, 'anchor-1'))?.content).toBe('First anchor note');
    expect(getNoteDraft(getArtifactsForAnchor(secondStorage, 'anchor-2'))?.content).toBe('Second anchor note');
  });

  it('marks a note as finished without discarding its content', () => {
    const draftStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'A finished thought.',
    });

    const nextStorage = completeNoteDraft(draftStorage, 'anchor-1');
    const note = getArtifactsForAnchor(nextStorage, 'anchor-1')[0];

    expect(getNoteDraft(getArtifactsForAnchor(nextStorage, 'anchor-1'))).toBeNull();
    expect(note).toMatchObject({
      type: 'note',
      content: 'A finished thought.',
      status: 'complete',
    });
  });

  it('removes a blank note instead of keeping an empty finished one', () => {
    const draftStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: '   ',
    });

    const nextStorage = completeNoteDraft(draftStorage, 'anchor-1');

    expect(getArtifactsForAnchor(nextStorage, 'anchor-1')).toEqual([]);
  });

  it('removes one output and its task without disturbing sibling outputs', () => {
    const storage = {
      artifactsByAnchorId: {
        'anchor-1': [
          {
            id: 'artifact-1',
            documentId: 'document-1',
            anchorId: 'anchor-1',
            type: 'explanation' as const,
            title: 'First explanation',
            content: 'First',
            status: 'complete' as const,
            createdAt: '2026-07-22T10:00:00.000Z',
            updatedAt: '2026-07-22T10:00:00.000Z',
          },
          {
            id: 'artifact-2',
            documentId: 'document-1',
            anchorId: 'anchor-1',
            type: 'translation' as const,
            title: 'Translation',
            content: 'Second',
            status: 'running' as const,
            requestId: 'request-2',
            createdAt: '2026-07-22T11:00:00.000Z',
            updatedAt: '2026-07-22T11:00:00.000Z',
          },
        ],
      },
      tasksByRequestId: {
        'request-2': {
          requestId: 'request-2',
          anchorId: 'anchor-1',
          artifactId: 'artifact-2',
          status: 'running' as const,
        },
      },
    };

    const nextStorage = removeArtifact(storage, 'artifact-2');

    expect(getArtifactsForAnchor(nextStorage, 'anchor-1').map((artifact) => artifact.id))
      .toEqual(['artifact-1']);
    expect(nextStorage.tasksByRequestId).toEqual({});
  });

  it('removes every output and task attached to a deleted anchor', () => {
    const firstStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'First anchor note',
    });
    const secondStorage = upsertNoteDraft({
      storage: firstStorage,
      documentId: 'document-1',
      anchorId: 'anchor-2',
      content: 'Second anchor note',
    });

    const nextStorage = removeArtifactsForAnchor(secondStorage, 'anchor-1');

    expect(getArtifactsForAnchor(nextStorage, 'anchor-1')).toEqual([]);
    expect(getArtifactsForAnchor(nextStorage, 'anchor-2')).toHaveLength(1);
  });

  it('removes only outputs belonging to a deleted document', () => {
    const firstStorage = upsertNoteDraft({
      storage: createEmptyArtifactStorage(),
      documentId: 'document-1',
      anchorId: 'anchor-1',
      content: 'First document note',
    });
    const secondStorage = upsertNoteDraft({
      storage: firstStorage,
      documentId: 'document-2',
      anchorId: 'anchor-2',
      content: 'Second document note',
    });

    const nextStorage = removeArtifactsForDocument(secondStorage, 'document-1');

    expect(getArtifactsForAnchor(nextStorage, 'anchor-1')).toEqual([]);
    expect(getArtifactsForAnchor(nextStorage, 'anchor-2')).toHaveLength(1);
  });
});
