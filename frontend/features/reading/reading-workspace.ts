import {
  getActiveAnchorIdForDocument,
  removeAnchorsForDocument,
  setActiveAnchorForDocument,
  type TextAnchor,
} from '@/features/anchors';
import {
  removeArtifactsForAnchor,
  removeArtifactsForDocument,
} from '@/features/artifacts';
import {
  addDocumentToLibrary,
  closeLibraryDocument,
  openLibraryDocument,
  removeDocumentFromLibrary,
  renameLibraryDocument,
} from './reading-library';
import type { LocalWorkspaceState } from './reading-cloud-state';
import type { AnalysisLanguage, ReaderPreferences, WorkspaceDocument } from './reading-types';
import type { ArtifactStorageState } from '@/features/artifacts';

export function addDocument(
  state: LocalWorkspaceState,
  document: WorkspaceDocument,
): LocalWorkspaceState {
  return {
    ...state,
    documentLibrary: addDocumentToLibrary(state.documentLibrary, document),
  };
}

export function openDocument(
  state: LocalWorkspaceState,
  documentId: string,
): LocalWorkspaceState {
  const documentLibrary = openLibraryDocument(state.documentLibrary, documentId);
  return documentLibrary === state.documentLibrary ? state : { ...state, documentLibrary };
}

export function closeDocument(state: LocalWorkspaceState): LocalWorkspaceState {
  return { ...state, documentLibrary: closeLibraryDocument(state.documentLibrary) };
}

export function renameDocument(
  state: LocalWorkspaceState,
  documentId: string,
  title: string,
): LocalWorkspaceState {
  const documentLibrary = renameLibraryDocument(state.documentLibrary, documentId, title);
  return documentLibrary === state.documentLibrary ? state : { ...state, documentLibrary };
}

export function deleteDocument(
  state: LocalWorkspaceState,
  documentId: string,
): LocalWorkspaceState {
  if (!state.documentLibrary.documentsById[documentId]) return state;
  return {
    ...state,
    documentLibrary: removeDocumentFromLibrary(state.documentLibrary, documentId),
    anchorStorage: removeAnchorsForDocument(state.anchorStorage, documentId),
    artifactStorage: removeArtifactsForDocument(state.artifactStorage, documentId),
  };
}

export function activateAnchor(
  state: LocalWorkspaceState,
  anchor: TextAnchor,
): LocalWorkspaceState {
  const anchorStorage = setActiveAnchorForDocument({
    ...state.anchorStorage,
    anchorsById: { ...state.anchorStorage.anchorsById, [anchor.id]: anchor },
  }, anchor.documentId, anchor.id);
  return { ...state, anchorStorage };
}

export function setActiveAnchor(
  state: LocalWorkspaceState,
  documentId: string,
  anchorId: string | null,
): LocalWorkspaceState {
  return {
    ...state,
    anchorStorage: setActiveAnchorForDocument(state.anchorStorage, documentId, anchorId),
  };
}

export function deleteAnchor(
  state: LocalWorkspaceState,
  anchorId: string,
  activeDocumentId: string | null,
): LocalWorkspaceState {
  const anchor = state.anchorStorage.anchorsById[anchorId];
  if (!anchor) return state;

  const anchorsById = { ...state.anchorStorage.anchorsById };
  delete anchorsById[anchorId];
  let anchorStorage = { ...state.anchorStorage, anchorsById };
  const activeAnchorId = getActiveAnchorIdForDocument(state.anchorStorage, activeDocumentId ?? undefined);
  if (activeAnchorId === anchorId) {
    anchorStorage = setActiveAnchorForDocument(
      anchorStorage,
      activeDocumentId ?? anchor.documentId,
      null,
    );
  }
  return {
    ...state,
    anchorStorage,
    artifactStorage: removeArtifactsForAnchor(state.artifactStorage, anchorId),
  };
}

export function updateArtifactStorage(
  state: LocalWorkspaceState,
  updater: (storage: ArtifactStorageState) => ArtifactStorageState,
): LocalWorkspaceState {
  const artifactStorage = updater(state.artifactStorage);
  return artifactStorage === state.artifactStorage ? state : { ...state, artifactStorage };
}

export function updateReaderPreference<Key extends keyof ReaderPreferences>(
  state: LocalWorkspaceState,
  key: Key,
  value: ReaderPreferences[Key],
): LocalWorkspaceState {
  const current = state.readerPreferences;
  let readerPreferences = { ...current, [key]: value } as ReaderPreferences;
  if (key === 'fontFamily' && current.fontLinked) {
    readerPreferences = { ...readerPreferences, closeReadingFontFamily: value as ReaderPreferences['fontFamily'] };
  }
  if (key === 'fontLinked' && value === true) {
    readerPreferences = { ...readerPreferences, closeReadingFontFamily: current.fontFamily };
  }
  return { ...state, readerPreferences };
}

export function setAnalysisLanguage(
  state: LocalWorkspaceState,
  language: AnalysisLanguage,
): LocalWorkspaceState {
  return { ...state, analysisLanguage: language };
}
