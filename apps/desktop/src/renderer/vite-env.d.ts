/// <reference types="vite/client" />

// Define the shape of our custom Electron IPC bridge
export interface ResonanceAPI {
  // Folder selection
  openFolder: () => Promise<string | null>;
  selectFolder: () => Promise<string | null>;

  // Library scanning & querying
  scanDirectory: (dirPath: string) => Promise<{ success: boolean; data?: any; error?: string; added?: number; skipped?: number }>;
  onScanProgress: (cb: (progress: any) => void) => () => void;
  getTracks: (limit?: number, offset?: number, sortBy?: string, sortDir?: string) => Promise<any>;
  getTrackCount: () => Promise<number>;
  searchTracks: (query: string, limit?: number) => Promise<any[]>;

  // Tag editing & Artwork
  updateField: (id: number, field: string, value: any) => Promise<void>;
  updateTrackField?: (id: number, field: string, value: any) => Promise<void>;
  batchUpdateArtist?: (oldName: string, newName: string) => Promise<number>;
  getCoverArt: (id: number) => Promise<string | null>;

  // AI Whisper transcription
  initAiModel?: () => Promise<boolean>;
  onAiProgress?: (cb: (progress: any) => void) => () => void;
  transcribeTrack: (filePath: string, trackId?: number) => Promise<any>;
  saveLyrics: (trackId: number, words: any, isInstrumental?: boolean) => Promise<boolean>;
  getLyrics: (trackId: number) => Promise<any>;

  // Acoustic Waveform Caching
  saveWaveform: (trackId: number, peaks: number[]) => Promise<boolean>;
  getWaveform: (trackId: number) => Promise<number[] | null>;

  // 4K Video Export Pipeline
  selectSavePath: (defaultName?: string) => Promise<string | null>;
  startRender: (settings: any) => Promise<string>;
  onRenderProgress: (cb: (percent: number) => void) => () => void;
  finishRender?: () => void;

  // Hardware Configuration Persistence
  getConfig: (key: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<any>;
  removeConfig: (key: string) => Promise<any>;

  // Window Controls
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  isWindowMaximized?: () => Promise<boolean>;
  onWindowMaximizedChange?: (cb: (isMax: boolean) => void) => () => void;

  // Lifecycle
  onTeardown?: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    resonance: ResonanceAPI;
    api: ResonanceAPI;
  }
}

export {};
