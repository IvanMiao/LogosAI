import type {
  ReadingSessionSnapshot,
  WorkspacePreferencesPayload,
} from '@/features/reading';
import { requestCloudEmpty, requestCloudJson } from './cloudApi';

export interface StoredReadingSession extends ReadingSessionSnapshot {
  revision: number;
  syncedAt: string;
}

export interface CloudWorkspaceState {
  preferences: WorkspacePreferencesPayload;
  sessions: StoredReadingSession[];
}

export function getCloudWorkspace(): Promise<CloudWorkspaceState> {
  return requestCloudJson<CloudWorkspaceState>('/api/workspace');
}

export function saveCloudReadingSession(
  snapshot: ReadingSessionSnapshot,
): Promise<{ revision: number; syncedAt: string }> {
  return requestCloudJson(`/api/reading-sessions/${encodeURIComponent(snapshot.document.id)}`, {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
}

export function deleteCloudReadingSession(sessionId: string): Promise<void> {
  return requestCloudEmpty(
    `/api/reading-sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' },
  );
}

export function saveCloudWorkspacePreferences(
  preferences: WorkspacePreferencesPayload,
): Promise<{ preferences: WorkspacePreferencesPayload }> {
  return requestCloudJson('/api/workspace/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}
