// apps/desktop/src/renderer/types/track.ts
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
  has_lyrics: number;
  is_instrumental: number;
  lyrics_json?: string | null;
  waveform_peaks?: string | null;
  cover_art_mime?: string | null;
  date_added: number;
  date_modified: number;
}
