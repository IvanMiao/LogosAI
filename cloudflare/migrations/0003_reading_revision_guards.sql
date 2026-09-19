-- Abort the entire aggregate-replacement batch when another writer won.
CREATE TRIGGER reading_session_revision_update
BEFORE UPDATE ON reading_session
WHEN NEW.revision != OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT, 'READING_REVISION_CONFLICT');
END;

CREATE TRIGGER reading_session_revision_insert
AFTER INSERT ON reading_session
WHEN NEW.revision != 1
BEGIN
  SELECT RAISE(ABORT, 'READING_REVISION_CONFLICT');
END;
