import type {
  WorkspaceDocument,
  WorkspaceDocumentLibrary,
} from './reading.types';

function getDocumentRecency(document: WorkspaceDocument): string {
  return document.lastOpenedAt ?? document.updatedAt;
}

export function addDocumentToLibrary(
  library: WorkspaceDocumentLibrary,
  document: WorkspaceDocument,
  openedAt = new Date().toISOString(),
): WorkspaceDocumentLibrary {
  const openedDocument = { ...document, lastOpenedAt: openedAt };
  return {
    activeDocumentId: document.id,
    documentsById: {
      ...library.documentsById,
      [document.id]: openedDocument,
    },
  };
}

export function openLibraryDocument(
  library: WorkspaceDocumentLibrary,
  documentId: string,
  openedAt = new Date().toISOString(),
): WorkspaceDocumentLibrary {
  const document = library.documentsById[documentId];
  if (!document) {
    return library;
  }

  return {
    activeDocumentId: documentId,
    documentsById: {
      ...library.documentsById,
      [documentId]: { ...document, lastOpenedAt: openedAt },
    },
  };
}

export function closeLibraryDocument(
  library: WorkspaceDocumentLibrary,
): WorkspaceDocumentLibrary {
  return { ...library, activeDocumentId: null };
}

export function renameLibraryDocument(
  library: WorkspaceDocumentLibrary,
  documentId: string,
  title: string,
  updatedAt = new Date().toISOString(),
): WorkspaceDocumentLibrary {
  const document = library.documentsById[documentId];
  const normalizedTitle = title.trim();
  if (!document || !normalizedTitle) {
    return library;
  }

  return {
    ...library,
    documentsById: {
      ...library.documentsById,
      [documentId]: { ...document, title: normalizedTitle, updatedAt },
    },
  };
}

export function removeDocumentFromLibrary(
  library: WorkspaceDocumentLibrary,
  documentId: string,
): WorkspaceDocumentLibrary {
  if (!library.documentsById[documentId]) {
    return library;
  }

  const documentsById = { ...library.documentsById };
  delete documentsById[documentId];
  const remainingDocuments = Object.values(documentsById)
    .sort((left, right) => getDocumentRecency(right).localeCompare(getDocumentRecency(left)));
  const activeDocumentId = library.activeDocumentId === documentId
    ? remainingDocuments[0]?.id ?? null
    : library.activeDocumentId;

  return { activeDocumentId, documentsById };
}

export function listLibraryDocuments(
  library: WorkspaceDocumentLibrary,
  query = '',
): WorkspaceDocument[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return Object.values(library.documentsById)
    .filter((document) => (
      !normalizedQuery
      || document.title.toLocaleLowerCase().includes(normalizedQuery)
      || document.text.toLocaleLowerCase().includes(normalizedQuery)
    ))
    .sort((left, right) => getDocumentRecency(right).localeCompare(getDocumentRecency(left)));
}
