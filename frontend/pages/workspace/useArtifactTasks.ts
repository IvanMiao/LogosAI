import { useCallback, useRef } from 'react';
import {
  appendArtifactContent,
  createStreamingArtifact,
  prependArtifact,
  updateArtifact,
  type Artifact,
  type ArtifactStorageState,
} from '@/features/artifacts';
import { createClientId } from '@/utils/createClientId';
import type { AnalysisStreamStage } from '@/types';

interface ArtifactTaskMetadata {
  requestId: string;
  traceId?: string;
}

interface ArtifactTaskResult {
  content: string;
  requestId?: string;
  traceId?: string;
}

interface ArtifactTaskContext {
  signal: AbortSignal;
  onChunk: (chunk: string) => void;
  onMetadata: (metadata: ArtifactTaskMetadata) => void;
  onStage: (stage: AnalysisStreamStage) => void;
}

interface RunArtifactTaskInput {
  documentId: string;
  anchorId: string;
  title: string;
  type?: Artifact['type'];
  requestIdPrefix?: 'pending' | 'request';
  execute: (context: ArtifactTaskContext) => Promise<ArtifactTaskResult>;
}

interface CreateFailedArtifactInput {
  documentId: string;
  anchorId: string;
  title: string;
  message: string;
  type?: Artifact['type'];
}

type ArtifactStorageUpdater = (
  updater: (current: ArtifactStorageState) => ArtifactStorageState,
) => void;

interface UseArtifactTasksInput {
  artifactStorage: ArtifactStorageState;
  updateArtifacts: ArtifactStorageUpdater;
}

interface ArtifactTasks {
  runArtifactTask: (input: RunArtifactTaskInput) => Promise<void>;
  createFailedArtifact: (input: CreateFailedArtifactInput) => void;
  stopArtifact: (artifact: Artifact) => void;
  abortTasksFor: (
    matchesTask: (artifactId: string, anchorId: string) => boolean,
  ) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function clearRunningController(
  tasks: Record<string, AbortController>,
  controller: AbortController,
): void {
  for (const [requestId, runningController] of Object.entries(tasks)) {
    if (runningController === controller) {
      delete tasks[requestId];
    }
  }
}

export function useArtifactTasks({
  artifactStorage,
  updateArtifacts,
}: UseArtifactTasksInput): ArtifactTasks {
  const runningTasksRef = useRef<Record<string, AbortController>>({});

  const createFailedArtifact = useCallback(({
    documentId,
    anchorId,
    title,
    message,
    type = 'close_read',
  }: CreateFailedArtifactInput) => {
    const artifact = {
      ...createStreamingArtifact({
        documentId,
        anchorId,
        title,
        requestId: createClientId('request'),
        type,
      }),
      status: 'failed' as const,
      errorMessage: message,
    };
    updateArtifacts((current) => prependArtifact(current, artifact));
  }, [updateArtifacts]);

  const runArtifactTask = useCallback(async ({
    documentId,
    anchorId,
    title,
    type = 'close_read',
    requestIdPrefix = 'request',
    execute,
  }: RunArtifactTaskInput): Promise<void> => {
    const initialRequestId = createClientId(requestIdPrefix);
    const artifact = createStreamingArtifact({
      documentId,
      anchorId,
      title,
      requestId: initialRequestId,
      type,
    });
    const abortController = new AbortController();
    runningTasksRef.current[initialRequestId] = abortController;
    updateArtifacts((current) => prependArtifact(current, artifact));

    try {
      const result = await execute({
        signal: abortController.signal,
        onChunk: (chunk) => {
          updateArtifacts((current) => appendArtifactContent(
            current,
            artifact.id,
            chunk,
          ));
        },
        onMetadata: (metadata) => {
          runningTasksRef.current[metadata.requestId] = abortController;
          updateArtifacts((current) => updateArtifact(
            current,
            artifact.id,
            (item) => ({
              ...item,
              requestId: metadata.requestId,
              traceId: metadata.traceId,
              updatedAt: new Date().toISOString(),
            }),
          ));
        },
        onStage: (stage) => {
          updateArtifacts((current) => updateArtifact(
            current,
            artifact.id,
            (item) => ({
              ...item,
              stage,
              updatedAt: new Date().toISOString(),
            }),
          ));
        },
      });
      updateArtifacts((current) => updateArtifact(
        current,
        artifact.id,
        (item) => ({
          ...item,
          content: result.content,
          requestId: result.requestId ?? item.requestId,
          traceId: result.traceId ?? item.traceId,
          status: 'complete',
          stage: undefined,
          updatedAt: new Date().toISOString(),
        }),
      ));
    } catch (error) {
      updateArtifacts((current) => updateArtifact(
        current,
        artifact.id,
        (item) => ({
          ...item,
          status: isAbortError(error) ? 'stopped' : 'failed',
          errorMessage: isAbortError(error)
            ? undefined
            : error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        }),
      ));
    } finally {
      clearRunningController(runningTasksRef.current, abortController);
    }
  }, [updateArtifacts]);

  const stopArtifact = useCallback((artifact: Artifact) => {
    if (artifact.requestId) {
      runningTasksRef.current[artifact.requestId]?.abort();
    }
  }, []);

  const abortTasksFor = useCallback((
    matchesTask: (artifactId: string, anchorId: string) => boolean,
  ) => {
    for (const task of Object.values(artifactStorage.tasksByRequestId)) {
      if (matchesTask(task.artifactId, task.anchorId)) {
        runningTasksRef.current[task.requestId]?.abort();
      }
    }
  }, [artifactStorage.tasksByRequestId]);

  return {
    runArtifactTask,
    createFailedArtifact,
    stopArtifact,
    abortTasksFor,
  };
}
