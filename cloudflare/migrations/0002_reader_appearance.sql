ALTER TABLE workspace_preferences
  ADD COLUMN reader_font_linked INTEGER NOT NULL DEFAULT 1
  CHECK (reader_font_linked IN (0, 1));

UPDATE workspace_preferences
   SET reader_font_linked = CASE
     WHEN reader_font_family = close_reading_font_family THEN 1
     ELSE 0
   END;

ALTER TABLE workspace_preferences
  ADD COLUMN reader_line_width REAL NOT NULL DEFAULT 760;
