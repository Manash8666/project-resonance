// packages/library-core/src/index.ts
import Database from 'better-sqlite3';
import { parseFile } from 'music-metadata';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Track {
  id: number;
  file_path: string;
  file_name: string;
  title: string | null;
  artist_name: string | null;
  album_name: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  duration_ms: number | null;
  cover_art: Buffer | null;
  cover_art_mime: string | null;
  has_lyrics: number;
  is_instrumental: number;
  lyrics_json: string | null;
  waveform_peaks?: string | null;
  date_added: number;
  date_modified: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface ScanProgress {
  scanned: number;
  total: number;
  currentFile: string;
}

export interface ScanResult {
  added: number;
  skipped: number;
  errors: string[];
}

export type SortField = 'title' | 'artist_name' | 'album_name' | 'genre' | 'year' | 'duration_ms' | 'date_added';
export type SortDir   = 'ASC' | 'DESC';

// Allowed sort columns — guards against SQL injection
const SORT_ALLOWLIST = new Set<SortField>([
  'title', 'artist_name', 'album_name', 'genre', 'year', 'duration_ms', 'date_added',
]);

// Audio file extensions we recognise
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aiff', '.opus']);

// ─── LibraryEngine ────────────────────────────────────────────────────────────

export class LibraryEngine {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: false });

    // WAL mode: readers never block writers; concurrent IPC calls are safe
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous  = NORMAL');
    this.db.pragma('foreign_keys = ON');
    // Keep 64 MB of pages in memory — critical for large libraries
    this.db.pragma('cache_size   = -65536');

    // Execute our schema (idempotent — IF NOT EXISTS guards every statement)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);

    // Safe non-destructive column migrations for existing databases
    const columns = (this.db.pragma('table_info(tracks)') as Array<{ name: string }>).map((c) => c.name);
    if (!columns.includes('has_lyrics')) {
      this.db.exec('ALTER TABLE tracks ADD COLUMN has_lyrics INTEGER DEFAULT 0;');
    }
    if (!columns.includes('is_instrumental')) {
      this.db.exec('ALTER TABLE tracks ADD COLUMN is_instrumental INTEGER DEFAULT 0;');
    }
    if (!columns.includes('lyrics_json')) {
      this.db.exec('ALTER TABLE tracks ADD COLUMN lyrics_json TEXT;');
    }
    if (!columns.includes('waveform_peaks')) {
      this.db.exec('ALTER TABLE tracks ADD COLUMN waveform_peaks TEXT;');
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_has_lyrics ON tracks(has_lyrics);');
  }

  // ── Directory Scanner ──────────────────────────────────────────────────────

  /**
   * Recursively walks `dirPath`, parses every audio file with music-metadata,
   * and upserts results into SQLite.
   *
   * @param dirPath   - Absolute path to scan
   * @param onProgress - Called at most once per 100 ms with live progress data
   */
  async scanDirectory(
    dirPath: string,
    onProgress?: (p: ScanProgress) => void,
  ): Promise<ScanResult> {
    const files = this._collectAudioFiles(dirPath);
    const total  = files.length;
    const result: ScanResult = { added: 0, skipped: 0, errors: [] };

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO tracks
        (file_path, file_name, title, artist_name, album_name,
         genre, year, track_number, duration_ms, cover_art, cover_art_mime)
      VALUES
        (@file_path, @file_name, @title, @artist_name, @album_name,
         @genre, @year, @track_number, @duration_ms, @cover_art, @cover_art_mime)
    `);

    // Wrap all inserts in a single transaction — 100× faster than auto-commit
    const insertMany = this.db.transaction((rows: Parameters<typeof insert.run>[0][]) => {
      for (const row of rows) insert.run(row);
    });

    let lastProgressMs = 0;
    const batch: Parameters<typeof insert.run>[0][] = [];

    for (let i = 0; i < files.length; i++) {
      const fullPath = files[i];
      const fileName = path.basename(fullPath);

      // Throttled progress callback — max once per 100 ms
      const now = Date.now();
      if (onProgress && now - lastProgressMs >= 100) {
        onProgress({ scanned: i, total, currentFile: fileName });
        lastProgressMs = now;
      }

      try {
        const { common, format } = await parseFile(fullPath, { duration: true });

        let cover_art: Buffer | null     = null;
        let cover_art_mime: string | null = null;
        if (common.picture && common.picture.length > 0) {
          cover_art      = Buffer.from(common.picture[0].data);
          cover_art_mime = common.picture[0].format;
        }

        batch.push({
          file_path:    fullPath,
          file_name:    fileName,
          title:        common.title        ?? null,
          artist_name:  common.artist       ?? null,
          album_name:   common.album        ?? null,
          genre:        common.genre?.[0]   ?? null,
          year:         common.year         ?? null,
          track_number: common.track?.no    ?? null,
          duration_ms:  format.duration != null
                          ? Math.round(format.duration * 1000)
                          : null,
          cover_art,
          cover_art_mime,
        });

        result.added++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${fileName}: ${msg}`);
        result.skipped++;
      }
    }

    // Flush all rows in one transaction
    if (batch.length > 0) insertMany(batch);

    // Final progress ping
    onProgress?.({ scanned: total, total, currentFile: '' });

    return result;
  }

  // ── Read Queries ───────────────────────────────────────────────────────────

  /**
   * Paginated track retrieval for the virtualized grid.
   * Excludes the `cover_art` BLOB — the UI fetches art separately on demand.
   */
  getTracks(
    limit = 100,
    offset = 0,
    sortBy: SortField = 'artist_name',
    sortDir: SortDir  = 'ASC',
  ): Omit<Track, 'cover_art'>[] {
    const col = SORT_ALLOWLIST.has(sortBy) ? sortBy : 'artist_name';
    const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';

    return this.db
      .prepare(
        `SELECT id, file_path, file_name, title, artist_name, album_name,
                genre, year, track_number, duration_ms, cover_art_mime,
                has_lyrics, is_instrumental, waveform_peaks,
                date_added, date_modified
         FROM tracks
         ORDER BY ${col} ${dir}
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as Omit<Track, 'cover_art'>[];
  }

  /** Total track count — used by the virtualized grid to calculate scroll height. */
  getTrackCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as n FROM tracks').get() as { n: number }).n;
  }

  /** FTS5 full-text search — returns matching rows without the BLOB column. */
  searchTracks(query: string, limit = 200): Omit<Track, 'cover_art'>[] {
    // Append * for prefix matching so "dua" matches "Dua Lipa"
    const ftsQuery = query.trim().replace(/['"]/g, '') + '*';

    return this.db
      .prepare(
        `SELECT t.id, t.file_path, t.file_name, t.title, t.artist_name,
                t.album_name, t.genre, t.year, t.track_number, t.duration_ms,
                t.cover_art_mime, t.has_lyrics, t.is_instrumental, t.waveform_peaks,
                t.date_added, t.date_modified
         FROM tracks_fts
         JOIN tracks t ON tracks_fts.rowid = t.id
         WHERE tracks_fts MATCH ?
         LIMIT ?`,
      )
      .all(ftsQuery, limit) as Omit<Track, 'cover_art'>[];
  }

  /** Fetch the cover art BLOB for a single track (on-demand, not in grid rows). */
  getCoverArt(id: number): { data: Buffer; mime: string } | null {
    const row = this.db
      .prepare('SELECT cover_art, cover_art_mime FROM tracks WHERE id = ?')
      .get(id) as { cover_art: Buffer | null; cover_art_mime: string | null } | undefined;

    if (!row || !row.cover_art) return null;
    return { data: row.cover_art, mime: row.cover_art_mime ?? 'image/jpeg' };
  }

  // ── Write Operations ───────────────────────────────────────────────────────

  /** Update a single tag field on a single track. */
  updateField(id: number, field: keyof Omit<Track, 'id' | 'cover_art' | 'date_added'>, value: string | number | null): void {
    const WRITE_ALLOWLIST = new Set([
      'title', 'artist_name', 'album_name', 'genre',
      'year', 'track_number', 'file_name',
    ]);
    if (!WRITE_ALLOWLIST.has(field)) throw new Error(`Field "${field}" is not editable.`);

    this.db
      .prepare(`UPDATE tracks SET ${field} = ?, date_modified = strftime('%s','now') WHERE id = ?`)
      .run(value, id);
  }

  /**
   * Batch-rename: updates `artist_name` for every track that currently has `oldName`.
   * Returns the number of rows affected.
   */
  batchUpdateArtist(oldName: string, newName: string): number {
    const info = this.db
      .prepare(`UPDATE tracks SET artist_name = ?, date_modified = strftime('%s','now')
                WHERE artist_name = ?`)
      .run(newName, oldName);
    return info.changes;
  }

  // ── Lyrics & Vocal Telemetry ───────────────────────────────────────────────

  /** Save the AI-transcribed word-level timestamps directly to SQLite. */
  saveTranscription(trackId: number, words: WordTimestamp[], isInstrumental = false): void {
    const stmt = this.db.prepare(`
      UPDATE tracks 
      SET has_lyrics = 1, 
          is_instrumental = ?, 
          lyrics_json = ?,
          date_modified = strftime('%s', 'now')
      WHERE id = ?
    `);
    const jsonPayload = JSON.stringify(words);
    stmt.run(isInstrumental ? 1 : 0, jsonPayload, trackId);
  }

  /** Retrieve the parsed WordTimestamp array for the visualizer. */
  getLyricsForTrack(trackId: number): WordTimestamp[] | null {
    const row = this.db.prepare('SELECT has_lyrics, lyrics_json FROM tracks WHERE id = ?').get(trackId) as
      | { has_lyrics: number; lyrics_json: string | null }
      | undefined;

    if (!row || row.has_lyrics === 0 || !row.lyrics_json) {
      return null;
    }

    try {
      return JSON.parse(row.lyrics_json) as WordTimestamp[];
    } catch {
      return null;
    }
  }

  saveWaveform(trackId: number, peaks: number[]): void {
    const stmt = this.db.prepare(
      "UPDATE tracks SET waveform_peaks = ?, date_modified = strftime('%s', 'now') WHERE id = ?"
    );
    stmt.run(JSON.stringify(peaks), trackId);
  }

  getWaveform(trackId: number): number[] | null {
    const stmt = this.db.prepare('SELECT waveform_peaks FROM tracks WHERE id = ?');
    const row = stmt.get(trackId) as { waveform_peaks: string | null } | undefined;
    if (!row || !row.waveform_peaks) return null;
    try {
      return JSON.parse(row.waveform_peaks) as number[];
    } catch {
      return null;
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _collectAudioFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this._collectAudioFiles(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (AUDIO_EXTENSIONS.has(ext)) results.push(fullPath);
        }
      }
    } catch {
      // Unreadable subdirectory — skip silently
    }
    return results;
  }

  close(): void {
    this.db.close();
  }
}
