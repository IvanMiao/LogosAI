import { beforeEach, expect, it } from 'vitest';
import { readWorkspaceSyncJournal } from '@/features/reading/reading-sync-journal';

const JOURNAL_KEY = 'logosai.workspace.cloudSyncJournal:v1:reader';

beforeEach(() => localStorage.clear());

it('drops raw-content baselines from older journal versions while keeping revisions', () => {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify({
    knownSessionIds: ['reading'], dirtySessionIds: [], deletedSessionIds: [],
    preferencesDirty: false, revisions: { reading: 3 },
    baselines: { reading: { parts: { title: '"x"', source: '["text","paste"]' } } },
  }));
  const journal = readWorkspaceSyncJournal('reader');
  expect(journal.revisions).toEqual({ reading: 3 });
  expect(journal.baselines).toEqual({});
});
