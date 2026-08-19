export type DocumentSourceType = 'paste' | 'file' | 'history';
export type ReaderFontFamily = 'serif' | 'sans' | 'mono';
export type AnalysisLanguage = 'zh' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'ja';

export interface WorkspaceDocument {
  id: string;
  title: string;
  text: string;
  sourceType: DocumentSourceType;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface WorkspaceDocumentLibrary {
  activeDocumentId: string | null;
  documentsById: Record<string, WorkspaceDocument>;
}

export interface ReadingSessionStats {
  selectionCount: number;
  entryCount: number;
}

export interface ReaderPreferences {
  fontFamily: ReaderFontFamily;
  closeReadingFontFamily: ReaderFontFamily;
  fontSize: number;
  lineSpacing: number;
}
