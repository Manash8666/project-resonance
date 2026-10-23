import { app, BrowserWindow, ipcMain, dialog, protocol, net, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { LibraryEngine } from 'library-core';
import type { SortField, SortDir } from 'library-core';
import { VideoAssembler, RenderSettings } from './workers/videoAssembler.js';
import { TranscriptionEngine } from 'ai-transcriber';

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
let aiEngine: TranscriptionEngine | null = null;
let activeAssembler: VideoAssembler | null = null;

// Allowed media audio extensions for secure protocol streaming
const ALLOWED_AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus', '.aiff', '.alac'
]);

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

  // Security Hardening: Prevent opening external untrusted windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Security Hardening: Prevent navigation away from the local app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (isDev && navigationUrl.startsWith('http://localhost:5173')) {
      return;
    }
    event.preventDefault();
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

  // Native Save File Dialog for MP4 video export
  ipcMain.handle('dialog:selectSavePath', async (_e, defaultName?: string) => {
    if (!mainWindow) return null;
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Select Export Destination',
      defaultPath: defaultName || `Resonance_Export_${Date.now()}.mp4`,
      filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
    });
    return canceled ? null : filePath;
  });

  // Start Offline Headless Render Pipeline with FFmpeg
  ipcMain.handle('export:start', async (event, settings: RenderSettings) => {
    const renderWindow = new BrowserWindow({
      show: false,
      width: settings.width,
      height: settings.height,
      webPreferences: {
        offscreen: true,
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    const assembler = new VideoAssembler();
    activeAssembler = assembler;

    const renderPromise = assembler.start(settings, (percent) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('export:progress', percent);
      }
    });

    // Capture each rendered frame directly from GPU memory
    renderWindow.webContents.on('paint', (_e, _dirty, image) => {
      const rawBuffer = image.toBitmap();
      assembler.writeFrame(rawBuffer);
    });

    const renderUrl = isDev
      ? `http://localhost:5173?mode=render&audio=${encodeURIComponent(settings.audioPath)}`
      : `file://${path.join(__dirname, '../../renderer/index.html')}?mode=render&audio=${encodeURIComponent(settings.audioPath)}`;

    await renderWindow.loadURL(renderUrl);

    // Wait for renderer completion signal
    const onComplete = () => {
      assembler.finish();
      if (!renderWindow.isDestroyed()) renderWindow.close();
    };
    ipcMain.once('export:complete', onComplete);

    try {
      await renderPromise;
    } catch (err) {
      assembler.abort();
      if (!renderWindow.isDestroyed()) renderWindow.close();
      throw err;
    } finally {
      activeAssembler = null;
      ipcMain.removeListener('export:complete', onComplete);
    }
    return settings.outputPath;
  });

  // ─── AI Whisper Transcription ──────────────────────────────────────────────
  ipcMain.handle('ai:init', async (event) => {
    if (!aiEngine) aiEngine = new TranscriptionEngine();
    await aiEngine.initialize((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('ai:progress', progress);
      }
    });
    return true;
  });

  ipcMain.handle('ai:transcribe', async (_event, filePath: string) => {
    if (!aiEngine) aiEngine = new TranscriptionEngine();
    return await aiEngine.transcribe(filePath);
  });

  ipcMain.handle('library:saveLyrics', async (_event, trackId: number, words: any, isInstrumental = false) => {
    library.saveTranscription(trackId, words, isInstrumental);
    return true;
  });

  ipcMain.handle('library:getLyrics', async (_event, trackId: number) => {
    return library.getLyricsForTrack(trackId);
  });

  ipcMain.handle('library:saveWaveform', async (_event, trackId: number, peaks: number[]) => {
    library.saveWaveform(trackId, peaks);
    return true;
  });

  ipcMain.handle('library:getWaveform', async (_event, trackId: number) => {
    return library.getWaveform(trackId);
  });

  // ─── Hardware Configuration Persistence ────────────────────────────────────
  const configPath = path.join(app.getPath('userData'), 'resonance_config.json');

  const readConfigFile = (): Record<string, any> => {
    try {
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch {
      // Fallback
    }
    return {};
  };

  const writeConfigFile = (cfg: Record<string, any>): void => {
    try {
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write config file:', err);
    }
  };

  ipcMain.handle('config:get', async (_event, key: string) => {
    const cfg = readConfigFile();
    return cfg[key] ?? null;
  });

  ipcMain.handle('config:set', async (_event, key: string, value: any) => {
    const cfg = readConfigFile();
    cfg[key] = value;
    writeConfigFile(cfg);
    return true;
  });

  ipcMain.handle('config:remove', async (_event, key: string) => {
    const cfg = readConfigFile();
    delete cfg[key];
    writeConfigFile(cfg);
    return true;
  });

  // ─── Dual Namespace Aliases: resonance:* Protocol Compatibility ──────────────
  ipcMain.handle('resonance:getTracks', async (_e, limit = 1000, offset = 0) => {
    try {
      const tracks = library.getTracks(limit, offset);
      return { success: true, data: tracks };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('resonance:scanDirectory', async (_e, dirPath: string) => {
    try {
      const result = await library.scanDirectory(dirPath);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('resonance:transcribeTrack', async (_e, filePath: string, trackId?: number) => {
    try {
      if (!aiEngine) aiEngine = new TranscriptionEngine();
      await aiEngine.initialize();
      const words = await aiEngine.transcribe(filePath);
      const isInstrumental = words.length === 0;
      if (trackId) {
        library.saveTranscription(trackId, words, isInstrumental);
      }
      return { success: true, data: { words, isInstrumental } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('resonance:selectFolder', async () => {
    if (!mainWindow) return null;
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('resonance:getConfig', async (_e, key: string) => {
    const cfg = readConfigFile();
    return cfg[key] ?? null;
  });

  ipcMain.handle('resonance:setConfig', async (_e, key: string, value: any) => {
    const cfg = readConfigFile();
    cfg[key] = value;
    writeConfigFile(cfg);
    return true;
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Security Hardening: Deny all unsolicited device permissions
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(false);
  });

  // Security Hardening: Path-traversal proof and extension-validated media streaming
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1);
      }
      const normalizedPath = path.resolve(path.normalize(filePath));
      const ext = path.extname(normalizedPath).toLowerCase();

      // Enforce allowed audio extensions & file existence
      if (!ALLOWED_AUDIO_EXTENSIONS.has(ext) || !fs.existsSync(normalizedPath)) {
        return new Response('Access Denied: Invalid audio target', { status: 403 });
      }

      return net.fetch(pathToFileURL(normalizedPath).toString());
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
  });

  const dbPath = path.join(app.getPath('userData'), 'resonance_library.db');
  library = new LibraryEngine(dbPath);

  registerHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let isQuitting = false;

app.on('before-quit', (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;

  // 1. Broadcast teardown to all renderers to mute Web Audio and release WebGL contexts
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('app:teardown');
    }
  }

  // 2. Abort any active FFmpeg export processes to prevent orphaned background tasks
  if (activeAssembler) {
    try {
      activeAssembler.abort();
    } catch (err) {
      console.error('Error aborting active assembler during shutdown:', err);
    }
    activeAssembler = null;
  }

  // 3. Checkpoint SQLite WAL and close connection
  try {
    library?.close();
  } catch (err) {
    console.error('Failed to cleanly close library database:', err);
  }

  // 4. Finalize exit cleanly
  setTimeout(() => {
    app.exit(0);
  }, 100);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
