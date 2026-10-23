// apps/desktop/src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import type { SortField, SortDir, ScanProgress, ScanResult, Track } from 'library-core';

// ─── Typed API surface exposed to the renderer ────────────────────────────────

const resonanceAPI = {
  // Native folder picker
  openFolder: (): Promise<string | null> =>
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
    limit: number,
    offset: number,
    sortBy: SortField,
    sortDir: SortDir,
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
} as const;

contextBridge.exposeInMainWorld('resonance', resonanceAPI);

// Re-export the type so renderer can import it without touching Node
export type ResonanceAPI = typeof resonanceAPI;
