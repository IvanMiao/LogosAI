import { ApiError } from '../http/api-error';
import type { WorkspacePreferences } from './workspace.types';

const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  activeDocumentId: null,
  readerPreferences: {
    fontFamily: 'serif',
    closeReadingFontFamily: 'serif',
    fontLinked: true,
    fontSize: 18,
    lineSpacing: 1.75,
    lineWidth: 760,
  },
  analysisLanguage: 'en',
};

interface WorkspacePreferencesRow {
  active_document_id: string | null;
  reader_font_family: WorkspacePreferences['readerPreferences']['fontFamily'];
  close_reading_font_family: WorkspacePreferences['readerPreferences']['closeReadingFontFamily'];
  reader_font_linked: number;
  reader_font_size: number;
  reader_line_spacing: number;
  reader_line_width: number;
  analysis_language: WorkspacePreferences['analysisLanguage'];
}

export async function findWorkspacePreferences(
  database: D1Database,
  userId: string,
): Promise<WorkspacePreferences> {
  const row = await database
    .prepare(
      `SELECT active_document_id, reader_font_family,
              close_reading_font_family, reader_font_linked,
              reader_font_size, reader_line_spacing, reader_line_width,
              analysis_language
         FROM workspace_preferences
        WHERE user_id = ?`,
    )
    .bind(userId)
    .first<WorkspacePreferencesRow>();

  if (!row) {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }

  return {
    activeDocumentId: row.active_document_id,
    readerPreferences: {
      fontFamily: row.reader_font_family,
      closeReadingFontFamily: row.close_reading_font_family,
      fontLinked: Boolean(row.reader_font_linked),
      fontSize: row.reader_font_size,
      lineSpacing: row.reader_line_spacing,
      lineWidth: row.reader_line_width,
    },
    analysisLanguage: row.analysis_language,
  };
}

async function assertActiveSession(
  database: D1Database,
  userId: string,
  sessionId: string | null,
): Promise<void> {
  if (!sessionId) {
    return;
  }

  const session = await database
    .prepare('SELECT id FROM reading_session WHERE id = ? AND user_id = ?')
    .bind(sessionId, userId)
    .first();
  if (!session) {
    throw new ApiError(
      422,
      'INVALID_ACTIVE_SESSION',
      'The active reading session does not exist.',
    );
  }
}

export async function saveWorkspacePreferences(
  database: D1Database,
  userId: string,
  preferences: WorkspacePreferences,
): Promise<void> {
  await assertActiveSession(database, userId, preferences.activeDocumentId);
  const reader = preferences.readerPreferences;
  const now = Date.now();

  await database
    .prepare(
      `INSERT INTO workspace_preferences (
         user_id, active_document_id, reader_font_family,
         close_reading_font_family, reader_font_linked, reader_font_size,
         reader_line_spacing, reader_line_width, analysis_language,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         active_document_id = excluded.active_document_id,
         reader_font_family = excluded.reader_font_family,
         close_reading_font_family = excluded.close_reading_font_family,
         reader_font_linked = excluded.reader_font_linked,
         reader_font_size = excluded.reader_font_size,
         reader_line_spacing = excluded.reader_line_spacing,
         reader_line_width = excluded.reader_line_width,
         analysis_language = excluded.analysis_language,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      preferences.activeDocumentId,
      reader.fontFamily,
      reader.closeReadingFontFamily,
      reader.fontLinked ? 1 : 0,
      reader.fontSize,
      reader.lineSpacing,
      reader.lineWidth,
      preferences.analysisLanguage,
      now,
      now,
    )
    .run();
}
