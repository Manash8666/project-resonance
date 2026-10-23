-- packages/library-core/src/schema.sql

-- The core table. Denormalized for maximum read-speed in the UI grid.
CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    title TEXT,
    artist_name TEXT,
    album_name TEXT,
    genre TEXT,
    year INTEGER,
    track_number INTEGER,
    duration_ms INTEGER,
    -- We store the binary album art directly in the DB for instant retrieval
    cover_art BLOB,
    cover_art_mime TEXT,
    has_lyrics INTEGER DEFAULT 0,
    is_instrumental INTEGER DEFAULT 0,
    lyrics_json TEXT,
    date_added INTEGER DEFAULT (strftime('%s', 'now')),
    date_modified INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes to make filtering and sorting instant
CREATE INDEX IF NOT EXISTS idx_artist ON tracks(artist_name);
CREATE INDEX IF NOT EXISTS idx_album  ON tracks(album_name);
CREATE INDEX IF NOT EXISTS idx_genre  ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_has_lyrics ON tracks(has_lyrics);

-- FTS5 (Full-Text Search) allows the user to type "Dua Lipa" and instantly
-- find every track, album, and artist matching that string without lag.
CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
    title, artist_name, album_name, genre,
    content='tracks',
    content_rowid='id'
);

-- Triggers to keep the FTS index perfectly synced with the main table
CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
  INSERT INTO tracks_fts(rowid, title, artist_name, album_name, genre)
  VALUES (new.id, new.title, new.artist_name, new.album_name, new.genre);
END;

CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, title, artist_name, album_name, genre)
  VALUES('delete', old.id, old.title, old.artist_name, old.album_name, old.genre);
END;

CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
  INSERT INTO tracks_fts(tracks_fts, rowid, title, artist_name, album_name, genre)
  VALUES('delete', old.id, old.title, old.artist_name, old.album_name, old.genre);
  INSERT INTO tracks_fts(rowid, title, artist_name, album_name, genre)
  VALUES (new.id, new.title, new.artist_name, new.album_name, new.genre);
END;
