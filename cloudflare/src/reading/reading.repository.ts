import { ApiError } from '../http/api-error';
import type {
  ReadingAnchor,
  ReadingArtifact,
  ReadingDocument,
  ReadingSessionSnapshot,
  StoredReadingSession,
} from './reading.types';

interface SessionRow {
  id: string;
  title: string;
  source_text: string;
  source_type: ReadingDocument['sourceType'];
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  active_anchor_id: string | null;
  revision: number;
  synced_at: number;
}

interface AnchorRow {
  id: string;
  session_id: string;
  scope: ReadingAnchor['scope'];
  quote: string;
  normalized_quote: string;
  quote_hash: string;
  start_offset: number;
  end_offset: number;
  created_at: string;
}

interface ArtifactRow {
  id: string;
  session_id: string;
  anchor_id: string;
  type: ReadingArtifact['type'];
  title: string;
  content: string;
  status: ReadingArtifact['status'];
  created_at: string;
  updated_at: string;
  request_id: string | null;
  trace_id: string | null;
  error_message: string | null;
}

function mapDocument(row: SessionRow): ReadingDocument {
  return {
    id: row.id,
    title: row.title,
    text: row.source_text,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_opened_at ? { lastOpenedAt: row.last_opened_at } : {}),
  };
}

function mapAnchor(row: AnchorRow): ReadingAnchor {
  return {
    id: row.id,
    documentId: row.session_id,
    scope: row.scope,
    quote: row.quote,
    normalizedQuote: row.normalized_quote,
    quoteHash: row.quote_hash,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    createdAt: row.created_at,
  };
}

function mapArtifact(row: ArtifactRow): ReadingArtifact {
  return {
    id: row.id,
    documentId: row.session_id,
    anchorId: row.anchor_id,
    type: row.type,
    title: row.title,
    content: row.content,
    status: row.status === 'running' ? 'stopped' : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.request_id ? { requestId: row.request_id } : {}),
    ...(row.trace_id ? { traceId: row.trace_id } : {}),
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
  };
}

function groupBySession<Row extends { session_id: string }>(
  rows: Row[],
): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const sessionRows = grouped.get(row.session_id) ?? [];
    sessionRows.push(row);
    grouped.set(row.session_id, sessionRows);
  }
  return grouped;
}

export async function listReadingSessions(
  database: D1Database,
  userId: string,
): Promise<StoredReadingSession[]> {
  const sessionResult = await database
    .prepare(
      `SELECT id, title, source_text, source_type, created_at, updated_at,
              last_opened_at, active_anchor_id, revision, synced_at
         FROM reading_session
        WHERE user_id = ?
        ORDER BY COALESCE(last_opened_at, updated_at) DESC`,
    )
    .bind(userId)
    .all<SessionRow>();
  const sessions = sessionResult.results;
  if (sessions.length === 0) {
    return [];
  }

  const [anchorResult, artifactResult] = await Promise.all([
    listAnchors(database, userId),
    listArtifacts(database, userId),
  ]);
  const anchorsBySession = groupBySession(anchorResult);
  const artifactsBySession = groupBySession(artifactResult);

  return sessions.map((session) => ({
    document: mapDocument(session),
    activeAnchorId: session.active_anchor_id,
    anchors: (anchorsBySession.get(session.id) ?? []).map(mapAnchor),
    artifacts: (artifactsBySession.get(session.id) ?? []).map(mapArtifact),
    revision: session.revision,
    syncedAt: new Date(session.synced_at).toISOString(),
  }));
}

async function listAnchors(
  database: D1Database,
  userId: string,
): Promise<AnchorRow[]> {
  const result = await database
    .prepare(
      `SELECT a.id, a.session_id, a.scope, a.quote, a.normalized_quote,
              a.quote_hash, a.start_offset, a.end_offset, a.created_at
         FROM reading_anchor AS a
         JOIN reading_session AS s ON s.id = a.session_id
        WHERE s.user_id = ?
        ORDER BY a.position ASC`,
    )
    .bind(userId)
    .all<AnchorRow>();
  return result.results;
}

async function listArtifacts(
  database: D1Database,
  userId: string,
): Promise<ArtifactRow[]> {
  const result = await database
    .prepare(
      `SELECT e.id, e.session_id, e.anchor_id, e.type, e.title, e.content,
              e.status, e.created_at, e.updated_at, e.request_id, e.trace_id,
              e.error_message
         FROM reading_artifact AS e
         JOIN reading_session AS s ON s.id = e.session_id
        WHERE s.user_id = ?
        ORDER BY e.position ASC`,
    )
    .bind(userId)
    .all<ArtifactRow>();
  return result.results;
}

async function assertSessionOwnership(
  database: D1Database,
  sessionId: string,
  userId: string,
): Promise<number | null> {
  const row = await database
    .prepare('SELECT user_id, revision FROM reading_session WHERE id = ?')
    .bind(sessionId)
    .first<{ user_id: string; revision: number }>();

  if (row && row.user_id !== userId) {
    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Reading session not found.');
  }
  return row?.revision ?? null;
}

function createSessionStatement(
  database: D1Database,
  userId: string,
  snapshot: ReadingSessionSnapshot,
  revision: number,
  syncedAt: number,
): D1PreparedStatement {
  const document = snapshot.document;
  return database
    .prepare(
      `INSERT INTO reading_session (
         id, user_id, title, source_text, source_type, created_at, updated_at,
         last_opened_at, active_anchor_id, revision, synced_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         source_text = excluded.source_text,
         source_type = excluded.source_type,
         updated_at = excluded.updated_at,
         last_opened_at = excluded.last_opened_at,
         active_anchor_id = excluded.active_anchor_id,
         revision = excluded.revision,
         synced_at = excluded.synced_at
       WHERE reading_session.user_id = excluded.user_id`,
    )
    .bind(
      document.id,
      userId,
      document.title,
      document.text,
      document.sourceType,
      document.createdAt,
      document.updatedAt,
      document.lastOpenedAt ?? null,
      snapshot.activeAnchorId,
      revision,
      syncedAt,
    );
}

function createAnchorStatement(
  database: D1Database,
  anchor: ReadingAnchor,
  position: number,
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT INTO reading_anchor (
         id, session_id, scope, quote, normalized_quote, quote_hash,
         start_offset, end_offset, created_at, position
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      anchor.id,
      anchor.documentId,
      anchor.scope,
      anchor.quote,
      anchor.normalizedQuote,
      anchor.quoteHash,
      anchor.startOffset,
      anchor.endOffset,
      anchor.createdAt,
      position,
    );
}

function createArtifactStatement(
  database: D1Database,
  artifact: ReadingArtifact,
  position: number,
): D1PreparedStatement {
  return database
    .prepare(
      `INSERT INTO reading_artifact (
         id, session_id, anchor_id, type, title, content, status, created_at,
         updated_at, request_id, trace_id, error_message, position
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      artifact.id,
      artifact.documentId,
      artifact.anchorId,
      artifact.type,
      artifact.title,
      artifact.content,
      artifact.status,
      artifact.createdAt,
      artifact.updatedAt,
      artifact.requestId ?? null,
      artifact.traceId ?? null,
      artifact.errorMessage ?? null,
      position,
    );
}

export async function saveReadingSession(
  database: D1Database,
  userId: string,
  snapshot: ReadingSessionSnapshot,
): Promise<{ revision: number; syncedAt: string }> {
  const currentRevision = await assertSessionOwnership(
    database,
    snapshot.document.id,
    userId,
  );
  const revision = (currentRevision ?? 0) + 1;
  const syncedAt = Date.now();
  const sessionId = snapshot.document.id;
  const statements = [
    createSessionStatement(database, userId, snapshot, revision, syncedAt),
    database.prepare(
      `DELETE FROM reading_artifact
        WHERE session_id IN (
          SELECT id FROM reading_session WHERE id = ? AND user_id = ?
        )`,
    ).bind(sessionId, userId),
    database.prepare(
      `DELETE FROM reading_anchor
        WHERE session_id IN (
          SELECT id FROM reading_session WHERE id = ? AND user_id = ?
        )`,
    ).bind(sessionId, userId),
    ...snapshot.anchors.map((anchor, index) => (
      createAnchorStatement(database, anchor, index)
    )),
    ...snapshot.artifacts.map((artifact, index) => (
      createArtifactStatement(database, artifact, index)
    )),
  ];

  await database.batch(statements);
  return { revision, syncedAt: new Date(syncedAt).toISOString() };
}

export async function deleteReadingSession(
  database: D1Database,
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const result = await database
    .prepare('DELETE FROM reading_session WHERE id = ? AND user_id = ?')
    .bind(sessionId, userId)
    .run();
  return result.meta.changes > 0;
}
