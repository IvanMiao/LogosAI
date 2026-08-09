export type ReaderFontFamily = 'serif' | 'sans' | 'mono';
export type AnalysisLanguage = 'zh' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'ja';

export interface ReaderPreferences {
  fontFamily: ReaderFontFamily;
  closeReadingFontFamily: ReaderFontFamily;
  fontSize: number;
  lineSpacing: number;
}

export interface WorkspacePreferences {
  activeDocumentId: string | null;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
}
