// apps/desktop/src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { SortField, SortDir, ScanProgress, ScanResult, Track } from 'library-core';
import type { WordTimestamp } from 'ai-transcriber';

// ─── Typed API surface exposed to the renderer ────────────────────────────────

const resonanceAPI = {
  // Native folder picker
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFolder'),

  // Scan + streaming progress
  scanDirectory: (dirPath: string): Promise<ScanResult> =>
    ipcRenderer.invoke('library:scan', dirPath),

  onScanProgress: (cb: (p: ScanProgress) => void) => {
    const handler = (_: Electron.IpcRendererEvent, p: ScanProgress) => cb(p);
    ipcRenderer.on('library:scan:progress', handler);
    // Return a cleanup function — call it in useEffect teardown
    return () => ipcRenderer.removeListener('library:scan:progress', handler);
  },

  // Data queries
  getTracks: (
    limit = 1000,
    offset = 0,
    sortBy: SortField = 'artist_name',
    sortDir: SortDir = 'ASC',
  ): Promise<Omit<Track, 'cover_art'>[]> =>
    ipcRenderer.invoke('library:getTracks', limit, offset, sortBy, sortDir),

  getTrackCount: (): Promise<number> =>
    ipcRenderer.invoke('library:getTrackCount'),

  searchTracks: (query: string, limit?: number): Promise<Omit<Track, 'cover_art'>[]> =>
    ipcRenderer.invoke('library:search', query, limit),

  // Write operations
  updateField: (id: number, field: string, value: string | number | null): Promise<void> =>
    ipcRenderer.invoke('library:updateField', id, field, value),

  batchUpdateArtist: (oldName: string, newName: string): Promise<number> =>
    ipcRenderer.invoke('library:batchUpdateArtist', oldName, newName),

  // On-demand art (data URL string or null)
  getCoverArt: (id: number): Promise<string | null> =>
    ipcRenderer.invoke('library:getCoverArt', id),

  // Video Export Pipeline
  selectSavePath: (defaultName?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectSavePath', defaultName),

  startRender: (settings: {
    width: number;
    height: number;
    fps: number;
    codec: 'libx264' | 'libx265';
    audioPath: string;
    outputPath: string;
  }): Promise<string> =>
    ipcRenderer.invoke('export:start', settings),

  onRenderProgress: (cb: (percent: number) => void) => {
    const handler = (_: Electron.IpcRendererEvent, percent: number) => cb(percent);
    ipcRenderer.on('export:progress', handler);
    return () => ipcRenderer.removeListener('export:progress', handler);
  },

  finishRender: () => {
    ipcRenderer.send('export:complete');
  },

  // AI Whisper Transcription Pipeline
  initAiModel: (): Promise<boolean> =>
    ipcRenderer.invoke('ai:init'),

  onAiProgress: (cb: (progress: any) => void) => {
    const handler = (_: Electron.IpcRendererEvent, progress: any) => cb(progress);
    ipcRenderer.on('ai:progress', handler);
    return () => ipcRenderer.removeListener('ai:progress', handler);
  },

  transcribeTrack: async (filePath: string, trackId?: number): Promise<WordTimestamp[]> => {
    const res = await ipcRenderer.invoke('resonance:transcribeTrack', filePath, trackId);
    if (res && res.success && res.data?.words) {
      return res.data.words;
    }
    return Array.isArray(res) ? res : (res?.words ?? []);
  },

  saveLyrics: (trackId: number, words: WordTimestamp[], isInstrumental = false): Promise<boolean> =>
    ipcRenderer.invoke('library:saveLyrics', trackId, words, isInstrumental),

  getLyrics: (trackId: number): Promise<WordTimestamp[] | null> =>
    ipcRenderer.invoke('library:getLyrics', trackId),

  saveWaveform: (trackId: number, peaks: number[]): Promise<boolean> =>
    ipcRenderer.invoke('library:saveWaveform', trackId, peaks),

  getWaveform: (trackId: number): Promise<number[] | null> =>
    ipcRenderer.invoke('library:getWaveform', trackId),

  // Configuration Persistence
  getConfig: (key: string): Promise<any> =>
    ipcRenderer.invoke('config:get', key),

  setConfig: (key: string, value: any): Promise<boolean> =>
    ipcRenderer.invoke('config:set', key, value),

  removeConfig: (key: string): Promise<boolean> =>
    ipcRenderer.invoke('config:remove', key),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximizedChange: (cb: (isMax: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, isMax: boolean) => cb(isMax);
    ipcRenderer.on('window:maximized:change', handler);
    return () => ipcRenderer.removeListener('window:maximized:change', handler);
  },

  // Teardown hook
  onTeardown: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:teardown', handler);
    return () => ipcRenderer.removeListener('app:teardown', handler);
  },
} as const;

contextBridge.exposeInMainWorld('resonance', resonanceAPI);
contextBridge.exposeInMainWorld('api', resonanceAPI);

// Re-export the type so renderer can import it without touching Node
export type ResonanceAPI = typeof resonanceAPI;
export type { WordTimestamp };
