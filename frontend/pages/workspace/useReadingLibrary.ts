import { useCallback, useMemo, useState } from 'react';
import type { HistoryItem } from '@/types';
import type {
  WorkspaceDocument,
  WorkspaceDocumentLibrary,
} from '@/features/reading';
import {
  createWorkspaceDocument,
  isSupportedTextFile,
} from '@/features/reading/reading-core';
import {
  addDocumentToLibrary,
  closeLibraryDocument,
  listLibraryDocuments,
  openLibraryDocument,
  removeDocumentFromLibrary,
  renameLibraryDocument,
} from '@/features/reading/reading-library';
import {
  getActiveDocument,
  readStoredDocumentLibrary,
  writeStoredDocumentLibrary,
} from '@/features/reading/reading-storage';
import { readHistory, removeHistoryItem } from '@/utils/historyStorage';
import type { ImportState } from './workspace.types';

interface ReadingLibrary {
  documentLibrary: WorkspaceDocumentLibrary;
  activeDocument: WorkspaceDocument | null;
  documents: WorkspaceDocument[];
  history: HistoryItem[];
  importState: ImportState;
  workspaceError: string;
  setPasteText: (text: string) => void;
  importPastedText: () => boolean;
  importTextFile: (file: File | null) => Promise<boolean>;
  openDocument: (documentId: string) => boolean;
  renameDocument: (documentId: string, title: string) => void;
  removeDocument: (documentId: string) => boolean;
  startNewDocument: () => boolean;
  openHistoryAsDocument: (item: HistoryItem) => boolean;
  deleteHistoryItem: (id: number) => void;
  hydrateDocumentLibrary: (library: WorkspaceDocumentLibrary) => void;
}

export function useReadingLibrary(userId: string): ReadingLibrary {
  const [documentLibrary, setDocumentLibrary] = useState<WorkspaceDocumentLibrary>(
    () => readStoredDocumentLibrary(userId),
  );
  const [importState, setImportState] = useState<ImportState>({
    pasteText: '',
    importError: '',
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory(userId));
  const [workspaceError, setWorkspaceError] = useState('');
  const activeDocument = getActiveDocument(documentLibrary);
  const documents = useMemo(
    () => listLibraryDocuments(documentLibrary),
    [documentLibrary],
  );

  const commitDocumentLibrary = useCallback((nextLibrary: WorkspaceDocumentLibrary) => {
    if (!writeStoredDocumentLibrary(nextLibrary, userId)) {
      setWorkspaceError('This change could not be saved. Check browser storage and try again.');
      return false;
    }

    setDocumentLibrary(nextLibrary);
    setWorkspaceError('');
    return true;
  }, [userId]);

  const hydrateDocumentLibrary = useCallback((library: WorkspaceDocumentLibrary) => {
    setDocumentLibrary(library);
    writeStoredDocumentLibrary(library, userId);
  }, [userId]);

  const addDocument = useCallback((document: WorkspaceDocument): boolean => {
    return commitDocumentLibrary(addDocumentToLibrary(documentLibrary, document));
  }, [commitDocumentLibrary, documentLibrary]);

  const setPasteText = useCallback((text: string) => {
    setImportState((current) => ({ ...current, pasteText: text, importError: '' }));
  }, []);

  const importPastedText = useCallback((): boolean => {
    const text = importState.pasteText.trim();
    if (!text) {
      setImportState((current) => ({
        ...current,
        importError: 'Paste some text before importing.',
      }));
      return false;
    }

    if (!addDocument(createWorkspaceDocument(text, 'paste'))) {
      return false;
    }

    setImportState({ pasteText: '', importError: '' });
    return true;
  }, [addDocument, importState.pasteText]);

  const importTextFile = useCallback(async (file: File | null): Promise<boolean> => {
    if (!file) {
      return false;
    }

    if (!isSupportedTextFile(file.name)) {
      setImportState((current) => ({
        ...current,
        importError: 'Only .txt and .md files are supported in Workspace Alpha.',
      }));
      return false;
    }

    const text = (await file.text()).trim();
    if (!text) {
      setImportState((current) => ({
        ...current,
        importError: 'The selected file is empty.',
      }));
      return false;
    }

    if (!addDocument(createWorkspaceDocument(text, 'file', file.name))) {
      return false;
    }

    setImportState({ pasteText: '', importError: '' });
    return true;
  }, [addDocument]);

  const openDocument = useCallback((documentId: string): boolean => {
    return commitDocumentLibrary(openLibraryDocument(documentLibrary, documentId));
  }, [commitDocumentLibrary, documentLibrary]);

  const renameDocument = useCallback((documentId: string, title: string) => {
    commitDocumentLibrary(renameLibraryDocument(documentLibrary, documentId, title));
  }, [commitDocumentLibrary, documentLibrary]);

  const removeDocument = useCallback((documentId: string): boolean => {
    if (!documentLibrary.documentsById[documentId]) {
      return false;
    }

    return commitDocumentLibrary(removeDocumentFromLibrary(documentLibrary, documentId));
  }, [commitDocumentLibrary, documentLibrary]);

  const startNewDocument = useCallback((): boolean => {
    return commitDocumentLibrary(closeLibraryDocument(documentLibrary));
  }, [commitDocumentLibrary, documentLibrary]);

  const openHistoryAsDocument = useCallback((item: HistoryItem): boolean => {
    return addDocument(createWorkspaceDocument(
      item.prompt,
      'history',
      `Legacy analysis ${item.id}`,
    ));
  }, [addDocument]);

  const deleteHistoryItem = useCallback((id: number) => {
    setHistory(removeHistoryItem(id, userId));
  }, [userId]);

  return {
    documentLibrary,
    activeDocument,
    documents,
    history,
    importState,
    workspaceError,
    setPasteText,
    importPastedText,
    importTextFile,
    openDocument,
    renameDocument,
    removeDocument,
    startNewDocument,
    openHistoryAsDocument,
    deleteHistoryItem,
    hydrateDocumentLibrary,
  };
}
