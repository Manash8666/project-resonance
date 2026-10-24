// apps/desktop/src/renderer/mocks/browserBridge.ts
import type { ResonanceAPI } from '../vite-env.js';

// Pre-synthesized waveform peak array (160 normalized bars)
const generateMockPeaks = (seed: number): number[] => {
  const peaks: number[] = [];
  for (let i = 0; i < 160; i++) {
    const v = Math.abs(Math.sin((i + seed) * 0.12) * 0.6 + Math.cos(i * 0.05) * 0.4);
    peaks.push(Math.round(Math.max(0.08, Math.min(0.98, v)) * 100) / 100);
  }
  return peaks;
};

// Generates a tiny valid 1-second silent MP3 data URL for browser audio testing
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

const MOCK_TRACKS = [
  {
    id: 1,
    file_path: SILENT_AUDIO_DATA_URI,
    file_name: 'Redline Flow.mp3',
    title: 'Redline Flow',
    artist_name: 'Resonance Protocol',
    album_name: 'Cybernetic Soundscape',
    genre: 'Synthwave',
    year: 2026,
    track_number: 1,
    duration_ms: 215000,
    has_lyrics: 1,
    is_instrumental: 0,
    waveform_peaks: JSON.stringify(generateMockPeaks(42)),
    date_added: Date.now() - 3600000,
    date_modified: Date.now(),
  },
  {
    id: 2,
    file_path: SILENT_AUDIO_DATA_URI,
    file_name: 'Orbital Descent.flac',
    title: 'Orbital Descent',
    artist_name: 'Acoustic Core',
    album_name: 'Deep Resonance',
    genre: 'Electronic',
    year: 2026,
    track_number: 2,
    duration_ms: 184000,
    has_lyrics: 0,
    is_instrumental: 1,
    waveform_peaks: JSON.stringify(generateMockPeaks(17)),
    date_added: Date.now() - 7200000,
    date_modified: Date.now(),
  },
  {
    id: 3,
    file_path: SILENT_AUDIO_DATA_URI,
    file_name: 'Sub-Bass Velocity.wav',
    title: 'Sub-Bass Velocity',
    artist_name: 'Neural Grid',
    album_name: 'Zero Gravity',
    genre: 'Drum & Bass',
    year: 2026,
    track_number: 3,
    duration_ms: 242000,
    has_lyrics: 1,
    is_instrumental: 0,
    waveform_peaks: JSON.stringify(generateMockPeaks(88)),
    date_added: Date.now() - 10800000,
    date_modified: Date.now(),
  },
];

export function installBrowserBridge(): void {
  if (typeof window === 'undefined') return;

  // If running inside Electron, native bridge is already present
  if (window.resonance) {
    console.log('[Resonance] Native Electron IPC bridge detected.');
    return;
  }

  console.info('[Resonance] Running in Browser Live Mode — Installing Mock IPC Bridge');

  const mockApi: ResonanceAPI = {
    openFolder: async () => 'C:/Music/Cybernetic_Collection',
    selectFolder: async () => 'C:/Music/Cybernetic_Collection',

    scanDirectory: async (_dir) => {
      return { success: true, added: MOCK_TRACKS.length, skipped: 0, errors: [] };
    },

    onScanProgress: (cb) => {
      let count = 0;
      const interval = setInterval(() => {
        count += 1;
        cb({ scanned: count, total: MOCK_TRACKS.length, currentFile: MOCK_TRACKS[count - 1]?.file_name || '' });
        if (count >= MOCK_TRACKS.length) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    },

    getTracks: async () => [...MOCK_TRACKS],
    getTrackCount: async () => MOCK_TRACKS.length,

    searchTracks: async (query: string) => {
      const q = query.toLowerCase();
      return MOCK_TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist_name.toLowerCase().includes(q) ||
          t.album_name.toLowerCase().includes(q)
      );
    },

    updateField: async (id, field, value) => {
      const track = MOCK_TRACKS.find((t) => t.id === id);
      if (track) (track as any)[field] = value;
    },

    batchUpdateArtist: async (oldName, newName) => {
      let count = 0;
      for (const t of MOCK_TRACKS) {
        if (t.artist_name === oldName) {
          t.artist_name = newName;
          count++;
        }
      }
      return count;
    },

    getCoverArt: async () => null,

    selectSavePath: async () => 'C:/Exports/Resonance_Video.mp4',
    startRender: async () => 'C:/Exports/Resonance_Video.mp4',
    onRenderProgress: (_cb) => () => {},
    finishRender: () => {},

    initAiModel: async () => true,
    onAiProgress: (_cb) => () => {},
    transcribeTrack: async () => [
      { word: 'System', start: 0.2, end: 0.8 },
      { word: 'Ignition', start: 0.9, end: 1.5 },
      { word: 'Engaged', start: 1.6, end: 2.2 },
    ],

    saveLyrics: async () => true,
    getLyrics: async () => [
      { word: 'System', start: 0.2, end: 0.8 },
      { word: 'Ignition', start: 0.9, end: 1.5 },
      { word: 'Engaged', start: 1.6, end: 2.2 },
    ],

    saveWaveform: async () => true,
    getWaveform: async (trackId) => {
      const t = MOCK_TRACKS.find((x) => x.id === trackId);
      return t?.waveform_peaks ? JSON.parse(t.waveform_peaks) : generateMockPeaks(42);
    },

    getConfig: async () => null,
    setConfig: async () => true,
    removeConfig: async () => true,

    onTeardown: (_cb) => () => {},
  };

  window.resonance = mockApi;
  window.api = mockApi;
}
