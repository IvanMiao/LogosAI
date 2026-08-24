import { useCallback, useState } from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createEmptyArtifactStorage,
  type ArtifactStorageState,
} from '@/features/artifacts';
import { useArtifactTasks } from '@/pages/workspace/useArtifactTasks';

function useArtifactTaskHarness() {
  const [artifactStorage, setArtifactStorage] = useState<ArtifactStorageState>(
    createEmptyArtifactStorage,
  );
  const updateArtifacts = useCallback((
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => {
    setArtifactStorage((current) => updater(current));
  }, []);
  const tasks = useArtifactTasks({ artifactStorage, updateArtifacts });
  return { artifactStorage, ...tasks };
}

function getOnlyArtifact(storage: ArtifactStorageState) {
  return Object.values(storage.artifactsByAnchorId).flat()[0];
}

const TASK_SOURCE = {
  documentId: 'document-1',
  anchorId: 'anchor-1',
  title: 'Explanation',
  type: 'explanation' as const,
};

describe('artifact task lifecycle', () => {
  it('keeps metadata and reaches complete through the shared lifecycle', async () => {
    const { result } = renderHook(useArtifactTaskHarness);

    await act(async () => {
      await result.current.runArtifactTask({
        ...TASK_SOURCE,
        requestIdPrefix: 'pending',
        execute: async ({ onChunk, onMetadata }) => {
          onMetadata({ requestId: 'request-server', traceId: 'trace-server' });
          onChunk('Partial output');
          return {
            content: 'Final output',
            requestId: 'request-server',
            traceId: 'trace-server',
          };
        },
      });
    });

    expect(getOnlyArtifact(result.current.artifactStorage)).toMatchObject({
      content: 'Final output',
      requestId: 'request-server',
      traceId: 'trace-server',
      status: 'complete',
    });
  });

  it('records a transport failure without completing the artifact', async () => {
    const { result } = renderHook(useArtifactTaskHarness);

    await act(async () => {
      await result.current.runArtifactTask({
        ...TASK_SOURCE,
        execute: async ({ onStage }) => {
          onStage('interpret');
          throw new Error('Network unavailable');
        },
      });
    });

    expect(getOnlyArtifact(result.current.artifactStorage)).toMatchObject({
      status: 'failed',
      errorMessage: 'Network unavailable',
      stage: undefined,
    });
  });

  it('starts a fresh task when a failed artifact is retried', async () => {
    const { result } = renderHook(useArtifactTaskHarness);

    await act(async () => {
      await result.current.runArtifactTask({
        ...TASK_SOURCE,
        execute: async () => {
          throw new Error('First attempt failed');
        },
      });
      await result.current.runArtifactTask({
        ...TASK_SOURCE,
        execute: async () => ({ content: 'Retry succeeded' }),
      });
    });

    const artifacts = result.current.artifactStorage.artifactsByAnchorId['anchor-1'];
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]).toMatchObject({
      content: 'Retry succeeded',
      status: 'complete',
    });
    expect(artifacts[1]).toMatchObject({
      status: 'failed',
      errorMessage: 'First attempt failed',
    });
  });

  it('marks an aborted task as stopped and keeps partial content', async () => {
    const { result } = renderHook(useArtifactTaskHarness);
    let taskPromise: Promise<void>;

    act(() => {
      taskPromise = result.current.runArtifactTask({
        ...TASK_SOURCE,
        execute: ({ signal, onChunk, onStage }) => new Promise((_, reject) => {
          onStage('interpret');
          onChunk('Partial output');
          signal.addEventListener('abort', () => {
            reject(new DOMException('Cancelled', 'AbortError'));
          });
        }),
      });
    });

    await waitFor(() => {
      expect(getOnlyArtifact(result.current.artifactStorage)?.status).toBe('running');
    });
    act(() => {
      const artifact = getOnlyArtifact(result.current.artifactStorage);
      if (artifact) {
        result.current.stopArtifact(artifact);
      }
    });
    await act(async () => {
      await taskPromise;
    });

    expect(getOnlyArtifact(result.current.artifactStorage)).toMatchObject({
      content: 'Partial output',
      status: 'stopped',
      stage: undefined,
    });
  });

  it('creates a failed artifact before transport when configuration is missing', () => {
    const { result } = renderHook(useArtifactTaskHarness);

    act(() => {
      result.current.createFailedArtifact({
        ...TASK_SOURCE,
        message: 'Missing API key',
      });
    });

    expect(getOnlyArtifact(result.current.artifactStorage)).toMatchObject({
      status: 'failed',
      errorMessage: 'Missing API key',
    });
  });
});
