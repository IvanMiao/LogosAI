import { describe, expect, it } from 'vitest';
import {
  createEmptyArtifactStorage,
  getArtifactsForAnchor,
  getNoteDraft,
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
});
