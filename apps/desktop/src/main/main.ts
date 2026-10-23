// apps/desktop/src/main/main.ts
import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { LibraryEngine } from 'library-core';
import type { SortField, SortDir } from 'library-core';

// Register media protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let library: LibraryEngine;

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerHandlers(): void {
  // Open native folder picker — returns chosen path or null
  ipcMain.handle('dialog:openFolder', async () => {
    if (!mainWindow) return null;
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    });
    return canceled ? null : filePaths[0];
  });

  // Scan a directory; progress events are streamed back to the renderer
  ipcMain.handle('library:scan', async (event, dirPath: string) => {
    return library.scanDirectory(dirPath, (progress) => {
      // Only send if window is still alive
      if (!event.sender.isDestroyed()) {
        event.sender.send('library:scan:progress', progress);
      }
    });
  });

  // Paginated track fetch for the virtualized grid
  ipcMain.handle(
    'library:getTracks',
    (_e, limit: number, offset: number, sortBy: SortField, sortDir: SortDir) =>
      library.getTracks(limit, offset, sortBy, sortDir),
  );

  // Total track count — used by react-window to calculate scroll height
  ipcMain.handle('library:getTrackCount', () => library.getTrackCount());

  // FTS5 full-text search
  ipcMain.handle('library:search', (_e, query: string, limit?: number) =>
    library.searchTracks(query, limit),
  );

  // Single-field tag update
  ipcMain.handle('library:updateField', (_e, id: number, field: string, value: unknown) =>
    library.updateField(id, field as Parameters<LibraryEngine['updateField']>[1], value as never),
  );

  // Batch artist rename
  ipcMain.handle('library:batchUpdateArtist', (_e, oldName: string, newName: string) =>
    library.batchUpdateArtist(oldName, newName),
  );

  // On-demand cover art (returns base64 data URL or null)
  ipcMain.handle('library:getCoverArt', (_e, id: number) => {
    const art = library.getCoverArt(id);
    if (!art) return null;
    return `data:${art.mime};base64,${art.data.toString('base64')}`;
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  const dbPath = path.join(app.getPath('userData'), 'resonance_library.db');
  library = new LibraryEngine(dbPath);

  registerHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  library?.close();
  if (process.platform !== 'darwin') app.quit();
});
