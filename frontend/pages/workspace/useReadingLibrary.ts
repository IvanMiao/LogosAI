import { useCallback, useMemo, useState } from 'react';
import type { HistoryItem } from '@/types';
import type { WorkspaceDocument } from '@/features/reading';
import {
  createWorkspaceDocument,
  isSupportedTextFile,
} from '@/features/reading/reading-core';
import {
  listLibraryDocuments,
} from '@/features/reading/reading-library';
import {
  addDocument as addWorkspaceDocument,
  closeDocument,
  openDocument as openWorkspaceDocument,
  renameDocument as renameWorkspaceDocument,
} from '@/features/reading/reading-workspace';
import { readHistory, removeHistoryItem } from '@/utils/history-storage';
import { getActiveDocument } from '@/features/reading/reading-storage';
import type { ImportState } from './workspace-types';
import type { ReadingWorkspaceStore } from './useReadingWorkspace';

interface ReadingLibrary {
  activeDocument: WorkspaceDocument | null;
  documents: WorkspaceDocument[];
  history: HistoryItem[];
  importState: ImportState;
  setPasteText: (text: string) => void;
  setSessionTitle: (title: string) => void;
  importPastedText: () => boolean;
  importTextFile: (file: File | null) => Promise<boolean>;
  openDocument: (documentId: string) => boolean;
  renameDocument: (documentId: string, title: string) => void;
  startNewDocument: () => boolean;
  openHistoryAsDocument: (item: HistoryItem) => boolean;
  deleteHistoryItem: (id: number) => void;
}

export function useReadingLibrary(userId: string, store: ReadingWorkspaceStore): ReadingLibrary {
  const { commit, state } = store;
  const { documentLibrary } = state;
  const [importState, setImportState] = useState<ImportState>({
    pasteText: '',
    sessionTitle: '',
    importError: '',
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory(userId));
  const activeDocument = getActiveDocument(documentLibrary);
  const documents = useMemo(() => listLibraryDocuments(documentLibrary), [documentLibrary]);

  const addDocument = useCallback((document: WorkspaceDocument): boolean => (
    commit((current) => addWorkspaceDocument(current, document))
  ), [commit]);

  const setPasteText = useCallback((text: string) => {
    setImportState((current) => ({ ...current, pasteText: text, importError: '' }));
  }, []);

  const setSessionTitle = useCallback((title: string) => {
    setImportState((current) => ({ ...current, sessionTitle: title, importError: '' }));
  }, []);

  const importPastedText = useCallback((): boolean => {
    const text = importState.pasteText.trim();
    if (!text) {
      setImportState((current) => ({ ...current, importError: 'Paste some text before importing.' }));
      return false;
    }
    const added = addDocument(createWorkspaceDocument(
      text,
      'paste',
      'Untitled document',
      importState.sessionTitle,
    ));
    if (added) setImportState({ pasteText: '', sessionTitle: '', importError: '' });
    return added;
  }, [addDocument, importState.pasteText, importState.sessionTitle]);

  const importTextFile = useCallback(async (file: File | null): Promise<boolean> => {
    if (!file) return false;
    if (!isSupportedTextFile(file.name)) {
      setImportState((current) => ({
        ...current,
        importError: `Could not import ${file.name}. Only .txt and .md files are supported. Choose another file, or paste the text above.`,
      }));
      return false;
    }
    let text: string;
    try {
      text = (await file.text()).trim();
    } catch {
      setImportState((current) => ({
        ...current,
        importError: `Could not read ${file.name}. Try opening it again, or paste the text above.`,
      }));
      return false;
    }
    if (!text) {
      setImportState((current) => ({
        ...current,
        importError: 'The selected file is empty. Choose another file, or paste the text above.',
      }));
      return false;
    }
    const added = addDocument(createWorkspaceDocument(
      text,
      'file',
      file.name,
      importState.sessionTitle,
    ));
    if (added) setImportState({ pasteText: '', sessionTitle: '', importError: '' });
    return added;
  }, [addDocument, importState.sessionTitle]);

  const openDocument = useCallback((documentId: string): boolean => (
    commit((current) => openWorkspaceDocument(current, documentId))
  ), [commit]);

  const renameDocument = useCallback((documentId: string, title: string): void => {
    commit((current) => renameWorkspaceDocument(current, documentId, title));
  }, [commit]);

  const startNewDocument = useCallback((): boolean => (
    commit((current) => closeDocument(current))
  ), [commit]);

  const openHistoryAsDocument = useCallback((item: HistoryItem): boolean => (
    addDocument(createWorkspaceDocument(item.prompt, 'history', `Legacy analysis ${item.id}`))
  ), [addDocument]);

  const deleteHistoryItem = useCallback((id: number) => {
    setHistory(removeHistoryItem(id, userId));
  }, [userId]);

  return {
    activeDocument,
    documents,
    history,
    importState,
    setPasteText,
    setSessionTitle,
    importPastedText,
    importTextFile,
    openDocument,
    renameDocument,
    startNewDocument,
    openHistoryAsDocument,
    deleteHistoryItem,
  };
}
