import { readStoredAnchors, writeStoredAnchors } from '@/features/anchors';
import { readStoredArtifacts, writeStoredArtifacts } from '@/features/artifacts';
import type { LocalWorkspaceState } from './reading-cloud-state';
import {
  readStoredAnalysisLanguage,
  readStoredDocumentLibrary,
  readStoredReaderPreferences,
  writeStoredAnalysisLanguage,
  writeStoredDocumentLibrary,
  writeStoredReaderPreferences,
} from './reading-storage';

export function readLocalWorkspace(userId: string): LocalWorkspaceState {
  return {
    documentLibrary: readStoredDocumentLibrary(userId),
    anchorStorage: readStoredAnchors(userId),
    artifactStorage: readStoredArtifacts(userId),
    readerPreferences: readStoredReaderPreferences(userId),
    analysisLanguage: readStoredAnalysisLanguage(userId),
  };
}

export function writeLocalWorkspace(
  previous: LocalWorkspaceState,
  next: LocalWorkspaceState,
  userId: string,
): boolean {
  if (
    previous.documentLibrary !== next.documentLibrary
    && !writeStoredDocumentLibrary(next.documentLibrary, userId)
  ) {
    return false;
  }
  if (previous.anchorStorage !== next.anchorStorage) {
    writeStoredAnchors(next.anchorStorage, userId);
  }
  if (previous.artifactStorage !== next.artifactStorage) {
    writeStoredArtifacts(next.artifactStorage, userId);
  }
  if (previous.readerPreferences !== next.readerPreferences) {
    writeStoredReaderPreferences(next.readerPreferences, userId);
  }
  if (previous.analysisLanguage !== next.analysisLanguage) {
    writeStoredAnalysisLanguage(next.analysisLanguage, userId);
  }
  return true;
}
