// apps/desktop/src/renderer/App.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { List } from 'react-window';
import type { SortField, SortDir, ScanProgress, Track } from 'library-core';
import { ResonanceVisualizer, VisualizerScene, DynamicsMode } from 'visual-engine';

// Shape of track without cover art BLOB returned by IPC
export type GridTrack = Omit<Track, 'cover_art'>;

export default function App() {
  const [tracks, setTracks] = useState<GridTrack[]>([]);
  const [trackCount, setTrackCount] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<GridTrack | null>(null);
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
  const [isLoadingArt, setIsLoadingArt] = useState(false);

  // Audio Playback & Telemetry
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<GridTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);

  // View layout & Dynamics Mode
  const [viewMode, setViewMode] = useState<'grid' | 'split' | 'visualizer'>('split');
  const [dynamicsMode, setDynamicsMode] = useState<DynamicsMode>('ballistic');
  const [visualizerStyle, setVisualizerStyle] = useState<'3d-mesh' | '2d-hud'>('3d-mesh');

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<SortField>('artist_name');
  const [sortDir, setSortDir] = useState<SortDir>('ASC');
  const [searchQuery, setSearchQuery] = useState('');

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanStats, setScanStats] = useState<{ added: number; skipped: number } | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Batch rename modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [oldArtistInput, setOldArtistInput] = useState('');
  const [newArtistInput, setNewArtistInput] = useState('');
  const [batchResultMsg, setBatchResultMsg] = useState<string | null>(null);

  // Window viewport measurement
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // Cache for loaded cover art
  const artCache = useRef<Map<number, string | null>>(new Map());

  // Listen to window resize
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subscribe to streaming scan progress
  useEffect(() => {
    if (!window.resonance?.onScanProgress) return;
    const cleanup = window.resonance.onScanProgress((p: ScanProgress) => {
      setScanProgress(p);
    });
    return cleanup;
  }, []);

  // Fetch track list
  const loadTracks = useCallback(async () => {
    try {
      if (searchQuery.trim().length > 0) {
        const results = await window.resonance.searchTracks(searchQuery.trim(), 500);
        setTracks(results);
        setTrackCount(results.length);
      } else {
        const [data, count] = await Promise.all([
          window.resonance.getTracks(2000, 0, sortBy, sortDir),
          window.resonance.getTrackCount(),
        ]);
        setTracks(data);
        setTrackCount(count);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
    }
  }, [searchQuery, sortBy, sortDir]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Load cover art when selected track changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedTrack(null);
      setCoverArtUrl(null);
      return;
    }
    const track = tracks.find((t) => t.id === selectedId) ?? null;
    setSelectedTrack(track);

    if (artCache.current.has(selectedId)) {
      setCoverArtUrl(artCache.current.get(selectedId) ?? null);
      return;
    }

    setIsLoadingArt(true);
    window.resonance
      .getCoverArt(selectedId)
      .then((artUrl) => {
        artCache.current.set(selectedId, artUrl);
        setCoverArtUrl(artUrl);
      })
      .catch((err) => {
        console.error('Failed to fetch cover art:', err);
        setCoverArtUrl(null);
      })
      .finally(() => {
        setIsLoadingArt(false);
      });
  }, [selectedId, tracks]);

  // Audio Playback Handling
  const playTrack = (track: GridTrack) => {
    setCurrentTrack(track);
    setSelectedId(track.id);
    if (audioRef.current) {
      audioRef.current.src = `media:///${encodeURIComponent(track.file_path)}`;
      audioRef.current.volume = volume;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio playback error:', err));
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack && tracks.length > 0) {
        playTrack(tracks[0]);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Scanning
  const handleScan = async () => {
    try {
      const folder = await window.resonance.openFolder();
      if (!folder) return;

      setIsScanning(true);
      setScanProgress({ scanned: 0, total: 0, currentFile: 'Initializing scanner...' });
      setScanStats(null);

      const result = await window.resonance.scanDirectory(folder);
      setScanStats({ added: result.added, skipped: result.skipped });
      await loadTracks();
    } catch (err) {
      console.error('Directory scan error:', err);
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(null), 3500);
    }
  };

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortDir('ASC');
    }
  };

  // Inline Tag Editing
  const startEditing = (id: number, field: string, currentValue: string | number | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue != null ? String(currentValue) : '');
  };

  const commitEditing = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const finalValue = editValue.trim() === '' ? null : editValue.trim();

    try {
      await window.resonance.updateField(id, field, finalValue);
      setTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: finalValue } : t)),
      );
      if (selectedTrack?.id === id) {
        setSelectedTrack((prev) => (prev ? { ...prev, [field]: finalValue } : null));
      }
      if (currentTrack?.id === id) {
        setCurrentTrack((prev) => (prev ? { ...prev, [field]: finalValue } : null));
      }
    } catch (err) {
      console.error('Failed to update field:', err);
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Batch Artist Rename
  const handleBatchUpdateArtist = async () => {
    if (!oldArtistInput.trim() || !newArtistInput.trim()) return;
    try {
      const changes = await window.resonance.batchUpdateArtist(
        oldArtistInput.trim(),
        newArtistInput.trim(),
      );
      setBatchResultMsg(`Successfully updated ${changes} track(s).`);
      await loadTracks();
      setTimeout(() => {
        setIsBatchModalOpen(false);
        setBatchResultMsg(null);
      }, 1200);
    } catch (err) {
      setBatchResultMsg(`Error: ${String(err)}`);
    }
  };

  // Duration Formatter
  const formatTime = (msOrSec: number | null, isSec = false): string => {
    if (msOrSec == null || isNaN(msOrSec)) return '0:00';
    const totalSecs = Math.floor(isSec ? msOrSec : msOrSec / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculated List Height based on viewMode
  const listHeight =
    viewMode === 'split'
      ? Math.max(240, windowHeight - 480)
      : Math.max(240, windowHeight - 210);

  // Virtualized Row Component
  const renderRow = ({
    index,
    style,
    tracks: rowTracks,
    selectedId: rowSelectedId,
    editingCell: rowEditingCell,
    editValue: rowEditValue,
  }: {
    index: number;
    style: React.CSSProperties;
    tracks: GridTrack[];
    selectedId: number | null;
    editingCell: { id: number; field: string } | null;
    editValue: string;
  }) => {
    const track = rowTracks[index];
    if (!track) return null;

    const isSelected = track.id === rowSelectedId;
    const isNowPlaying = currentTrack?.id === track.id;

    return (
      <div
        style={style}
        onClick={() => setSelectedId(track.id)}
        onDoubleClick={() => playTrack(track)}
        className={`group flex items-center h-10 px-4 border-b border-[#1c222c] cursor-pointer text-xs select-none transition-colors ${
          isSelected
            ? 'bg-[#14233a] border-l-2 border-l-[#00f0ff] text-white shadow-sm'
            : isNowPlaying
            ? 'bg-[#0f1d2c] border-l-2 border-l-emerald-400 text-white'
            : index % 2 === 0
            ? 'bg-[#0a0c10] hover:bg-[#12161f] text-zinc-300'
            : 'bg-[#08090d] hover:bg-[#12161f] text-zinc-300'
        }`}
      >
        {/* Track Index or Playing Indicator */}
        <div className="w-10 font-mono text-[11px] text-zinc-600 group-hover:text-zinc-400 flex items-center">
          {isNowPlaying && isPlaying ? (
            <span className="text-[#00f0ff] animate-pulse">▶</span>
          ) : (
            index + 1
          )}
        </div>

        {/* Title */}
        <div
          className="flex-1 font-medium truncate pr-3"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing(track.id, 'title', track.title);
          }}
        >
          {rowEditingCell?.id === track.id && rowEditingCell.field === 'title' ? (
            <input
              autoFocus
              type="text"
              value={rowEditValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing();
                if (e.key === 'Escape') setEditingCell(null);
              }}
              className="w-full bg-[#1e2736] border border-[#00f0ff] px-2 py-0.5 rounded text-xs text-white focus:outline-none"
            />
          ) : (
            <span className={isSelected ? 'text-[#00f0ff] font-semibold' : 'text-zinc-200'}>
              {track.title || track.file_name}
            </span>
          )}
        </div>

        {/* Artist */}
        <div
          className="w-48 truncate pr-3 text-zinc-400"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing(track.id, 'artist_name', track.artist_name);
          }}
        >
          {rowEditingCell?.id === track.id && rowEditingCell.field === 'artist_name' ? (
            <input
              autoFocus
              type="text"
              value={rowEditValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing();
                if (e.key === 'Escape') setEditingCell(null);
              }}
              className="w-full bg-[#1e2736] border border-[#00f0ff] px-2 py-0.5 rounded text-xs text-white focus:outline-none"
            />
          ) : (
            track.artist_name || <span className="text-zinc-600 italic">Unknown Artist</span>
          )}
        </div>

        {/* Album */}
        <div
          className="w-44 truncate pr-3 text-zinc-500"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing(track.id, 'album_name', track.album_name);
          }}
        >
          {rowEditingCell?.id === track.id && rowEditingCell.field === 'album_name' ? (
            <input
              autoFocus
              type="text"
              value={rowEditValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing();
                if (e.key === 'Escape') setEditingCell(null);
              }}
              className="w-full bg-[#1e2736] border border-[#00f0ff] px-2 py-0.5 rounded text-xs text-white focus:outline-none"
            />
          ) : (
            track.album_name || <span className="text-zinc-700">--</span>
          )}
        </div>

        {/* Genre */}
        <div
          className="w-28 truncate pr-3 text-zinc-500"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing(track.id, 'genre', track.genre);
          }}
        >
          {rowEditingCell?.id === track.id && rowEditingCell.field === 'genre' ? (
            <input
              autoFocus
              type="text"
              value={rowEditValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing();
                if (e.key === 'Escape') setEditingCell(null);
              }}
              className="w-full bg-[#1e2736] border border-[#00f0ff] px-2 py-0.5 rounded text-xs text-white focus:outline-none"
            />
          ) : (
            track.genre || <span className="text-zinc-700">--</span>
          )}
        </div>

        {/* Year */}
        <div
          className="w-16 font-mono text-zinc-500 text-center pr-2"
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing(track.id, 'year', track.year);
          }}
        >
          {rowEditingCell?.id === track.id && rowEditingCell.field === 'year' ? (
            <input
              autoFocus
              type="text"
              value={rowEditValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing();
                if (e.key === 'Escape') setEditingCell(null);
              }}
              className="w-full bg-[#1e2736] border border-[#00f0ff] px-1 py-0.5 rounded text-xs text-center text-white focus:outline-none"
            />
          ) : (
            track.year || <span className="text-zinc-700">--</span>
          )}
        </div>

        {/* Duration */}
        <div className="w-16 font-mono text-[11px] text-zinc-500 text-right">
          {formatTime(track.duration_ms)}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#08090a] text-zinc-200 select-none overflow-hidden font-sans">
      {/* Hidden Native Audio Element wired to Web Audio Bridge */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* ── DRAGGABLE TITLE BAR ────────────────────────────────────────────── */}
      <div className="title-bar-drag h-10 bg-[#0e1014] border-b border-[#1c222c] flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-100 uppercase">
            ⚡ PROJECT RESONANCE <span className="text-zinc-600 font-normal">// ZERO-ZERO CORE</span>
          </span>
        </div>

        <div className="no-drag flex items-center space-x-3 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-[#161b24] border border-[#252e3e] text-zinc-400">
            ENGINE: <span className="text-emerald-400 font-semibold">SQLITE FTS5</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#161b24] border border-[#252e3e] text-zinc-400">
            TELEMETRY: <span className="text-[#00f0ff] font-semibold">4096 FFT</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#161b24] border border-[#252e3e] text-zinc-400">
            TOTAL: <span className="text-[#00f0ff] font-semibold">{trackCount.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* ── COMMAND TOOLBAR & VIEW CONTROLLER ───────────────────────────────── */}
      <div className="h-14 bg-[#0a0c10] border-b border-[#1c222c] flex items-center justify-between px-4 gap-4 z-10">
        {/* Left: Scan & Batch Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded bg-[#121620] hover:bg-[#1a2130] border border-[#232b3b] hover:border-[#00f0ff]/50 text-xs font-medium text-zinc-200 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <svg
              className={`w-3.5 h-3.5 text-[#00f0ff] ${isScanning ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{isScanning ? 'Scanning...' : 'Scan Music Folder'}</span>
          </button>

          <button
            onClick={() => {
              if (selectedTrack?.artist_name) setOldArtistInput(selectedTrack.artist_name);
              setIsBatchModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#121620] hover:bg-[#1a2130] border border-[#232b3b] text-xs font-medium text-zinc-300 transition-all cursor-pointer active:scale-95"
          >
            <span>Batch Rename</span>
          </button>

          <button
            onClick={() => loadTracks()}
            title="Refresh Library"
            className="p-1.5 rounded bg-[#121620] hover:bg-[#1a2130] border border-[#232b3b] text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center space-x-1 bg-[#121620] border border-[#232b3b] p-0.5 rounded text-xs font-mono">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            GRID
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              viewMode === 'split' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            SPLIT (3D HUD)
          </button>
          <button
            onClick={() => setViewMode('visualizer')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              viewMode === 'visualizer' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            FULL VISUALIZER
          </button>
        </div>

        {/* Right: Instant Search Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search FTS5 database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 bg-[#0e1117] border border-[#1e2533] focus:border-[#00f0ff] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors font-mono"
            />
            <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-zinc-500 hover:text-white cursor-pointer">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── LIVE SCANNING HUD STRIP ────────────────────────────────────────── */}
      {scanProgress && (
        <div className="bg-[#0b121a] border-b border-[#00f0ff]/30 px-4 py-2 flex items-center justify-between animate-neon-pulse z-10">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="font-mono text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider">
              [ SCANNING AUDIO ]
            </span>
            <span className="font-mono text-xs text-zinc-300 truncate max-w-xl">
              {scanProgress.currentFile}
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-xs text-zinc-400">
            <span>
              {scanProgress.scanned.toLocaleString()} / {scanProgress.total.toLocaleString()}
            </span>
            <div className="w-24 h-1.5 bg-[#182333] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00f0ff] transition-all duration-150"
                style={{
                  width: `${
                    scanProgress.total > 0
                      ? Math.min(100, Math.round((scanProgress.scanned / scanProgress.total) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {scanStats && !scanProgress && (
        <div className="bg-[#0e1713] border-b border-emerald-500/30 px-4 py-1.5 flex items-center space-x-3 font-mono text-xs text-emerald-400">
          <span>✓ SCAN COMPLETE:</span>
          <span className="text-zinc-300">
            {scanStats.added} added, {scanStats.skipped} skipped
          </span>
        </div>
      )}

      {/* ── MAIN WORKSPACE VIEW ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Split / Full Visualizer Viewport */}
        {(viewMode === 'split' || viewMode === 'visualizer') && (
          <div
            className={`w-full ${
              viewMode === 'visualizer' ? 'flex-1' : 'h-64'
            } p-3 bg-[#08090a] transition-all duration-300 relative`}
          >
            {visualizerStyle === '3d-mesh' ? (
              <VisualizerScene
                audioElement={audioRef.current}
                albumArtUrl={coverArtUrl}
                className="w-full h-full shadow-2xl"
              />
            ) : (
              <ResonanceVisualizer
                audioElement={audioRef.current}
                dynamicsMode={dynamicsMode}
                className="w-full h-full shadow-2xl"
              />
            )}

            {/* Quick Engine Style Switcher (3D Terrain vs 2D HUD) */}
            <div className="absolute top-5 left-5 z-20 flex items-center space-x-1 bg-[#0b0e14]/85 backdrop-blur-xs border border-[#232b3b] p-1 rounded-md text-[10px] font-mono">
              <button
                onClick={() => setVisualizerStyle('3d-mesh')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  visualizerStyle === '3d-mesh'
                    ? 'bg-[#00f0ff] text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                3D TERRAIN MESH
              </button>
              <button
                onClick={() => setVisualizerStyle('2d-hud')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  visualizerStyle === '2d-hud'
                    ? 'bg-[#00f0ff] text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                2D HUD SPECTRUM
              </button>
            </div>
          </div>
        )}

        {/* Grid and Inspector Layout */}
        {viewMode !== 'visualizer' && (
          <div className="flex-1 flex overflow-hidden border-t border-[#1c222c]">
            {/* Left: Virtualized Table Grid */}
            <div className="flex-1 flex flex-col border-r border-[#1c222c] overflow-hidden">
              {/* Header Columns */}
              <div className="h-9 bg-[#0e1117] border-b border-[#1c222c] flex items-center px-4 text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider select-none">
                <div className="w-10">#</div>
                <div onClick={() => handleSort('title')} className="flex-1 flex items-center space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Title</span>
                  {sortBy === 'title' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
                <div onClick={() => handleSort('artist_name')} className="w-48 flex items-center space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Artist</span>
                  {sortBy === 'artist_name' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
                <div onClick={() => handleSort('album_name')} className="w-44 flex items-center space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Album</span>
                  {sortBy === 'album_name' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
                <div onClick={() => handleSort('genre')} className="w-28 flex items-center space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Genre</span>
                  {sortBy === 'genre' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
                <div onClick={() => handleSort('year')} className="w-16 flex items-center justify-center space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Year</span>
                  {sortBy === 'year' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
                <div onClick={() => handleSort('duration_ms')} className="w-16 flex items-center justify-end space-x-1 cursor-pointer hover:text-[#00f0ff]">
                  <span>Time</span>
                  {sortBy === 'duration_ms' && <span className="text-[#00f0ff]">{sortDir === 'ASC' ? '▲' : '▼'}</span>}
                </div>
              </div>

              {/* Virtualized Body */}
              <div className="flex-1 overflow-hidden">
                {tracks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-[#121620] border border-[#232b3b] flex items-center justify-center text-[#00f0ff]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <h3 className="font-mono text-sm font-semibold text-zinc-300">NO AUDIO LOADED</h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      Scan your music collection to feed high-resolution telemetry into the visual engine.
                    </p>
                  </div>
                ) : (
                  <List
                    rowCount={tracks.length}
                    rowHeight={40}
                    style={{ height: listHeight }}
                    rowProps={{
                      tracks,
                      selectedId,
                      editingCell,
                      editValue,
                    }}
                    rowComponent={renderRow}
                  />
                )}
              </div>
            </div>

            {/* Right: Inspector */}
            <div className="w-80 bg-[#0a0c10] flex flex-col overflow-y-auto">
              <div className="h-9 px-4 bg-[#0e1117] border-b border-[#1c222c] flex items-center">
                <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  // TELEMETRY INSPECTOR
                </span>
              </div>

              {selectedTrack ? (
                <div className="p-4 space-y-4">
                  {/* Cover Art Box */}
                  <div className="relative aspect-square w-full rounded-lg bg-[#121620] border border-[#232b3b] overflow-hidden flex items-center justify-center shadow-lg group">
                    {isLoadingArt ? (
                      <div className="text-xs font-mono text-zinc-500 animate-pulse">Loading art...</div>
                    ) : coverArtUrl ? (
                      <img src={coverArtUrl} alt={selectedTrack.album_name || 'Cover Art'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 space-y-2">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span className="font-mono text-[10px] uppercase">No embedded art</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Metadata */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {selectedTrack.title || selectedTrack.file_name}
                    </h4>
                    <p className="text-xs text-[#00f0ff] font-medium">{selectedTrack.artist_name || 'Unknown Artist'}</p>
                    <p className="text-xs text-zinc-400">{selectedTrack.album_name || 'Unknown Album'}</p>
                  </div>

                  <button
                    onClick={() => playTrack(selectedTrack)}
                    className="w-full py-2 bg-[#00f0ff] hover:bg-[#3bf3ff] text-black font-mono font-bold text-xs rounded transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>▶ ENGAGE AUDIO TELEMETRY</span>
                  </button>

                  {/* Data Attributes */}
                  <div className="border-t border-[#1c222c] pt-3 space-y-2 font-mono text-xs">
                    <div className="flex justify-between py-1 border-b border-[#141822]">
                      <span className="text-zinc-500">FORMAT</span>
                      <span className="text-zinc-300 uppercase">{selectedTrack.file_name.split('.').pop() || 'AUDIO'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#141822]">
                      <span className="text-zinc-500">DURATION</span>
                      <span className="text-zinc-300">{formatTime(selectedTrack.duration_ms)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#141822]">
                      <span className="text-zinc-500">GENRE</span>
                      <span className="text-zinc-300">{selectedTrack.genre || 'None'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#141822]">
                      <span className="text-zinc-500">YEAR</span>
                      <span className="text-zinc-300">{selectedTrack.year || 'None'}</span>
                    </div>
                    <div className="flex flex-col py-1 space-y-1">
                      <span className="text-zinc-500">FILE PATH</span>
                      <span className="text-[10px] text-zinc-400 break-all bg-[#0e1117] p-1.5 rounded border border-[#1c222c]">
                        {selectedTrack.file_path}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-600 space-y-2">
                  <p className="text-xs font-mono">Select a track to inspect telemetry and engage audio playback</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MASTER TRANSPORT DECK ──────────────────────────────────────────── */}
      <div className="h-16 bg-[#0a0c10] border-t border-[#1c222c] flex items-center justify-between px-6 z-20">
        {/* Left: Track Info & Play/Pause */}
        <div className="flex items-center space-x-4 w-72">
          <button
            onClick={togglePlayPause}
            className="w-10 h-10 rounded-full bg-[#121620] hover:bg-[#1c2333] border border-[#232b3b] hover:border-[#00f0ff] flex items-center justify-center text-[#00f0ff] cursor-pointer transition-all shadow-md active:scale-95"
          >
            {isPlaying ? (
              <span className="text-sm font-bold font-mono">❚❚</span>
            ) : (
              <span className="text-sm font-bold font-mono">▶</span>
            )}
          </button>

          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-white truncate">
              {currentTrack ? currentTrack.title || currentTrack.file_name : 'No Track Engaged'}
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {currentTrack ? currentTrack.artist_name || 'Unknown Artist' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Center: Timeline Scrubber */}
        <div className="flex-1 max-w-xl flex items-center space-x-3 font-mono text-xs text-zinc-400">
          <span>{formatTime(currentTime, true)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
          <span>{formatTime(duration, true)}</span>
        </div>

        {/* Right: Physics Mode Quick Select & Volume */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-[10px] font-mono bg-[#121620] p-1 rounded border border-[#232b3b]">
            <button
              onClick={() => setDynamicsMode('ballistic')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                dynamicsMode === 'ballistic' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              BALLISTIC
            </button>
            <button
              onClick={() => setDynamicsMode('fluid')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                dynamicsMode === 'fluid' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              FLUID
            </button>
            <button
              onClick={() => setDynamicsMode('hybrid')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                dynamicsMode === 'hybrid' ? 'bg-[#00f0ff] text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              HYBRID
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-zinc-500">VOL</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="w-16 h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
            />
          </div>
        </div>
      </div>

      {/* ── BATCH ARTIST RENAME MODAL ──────────────────────────────────────── */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#0e1117] border border-[#232b3b] rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c222c] pb-3">
              <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                ⚡ BATCH RENAME ARTIST
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">CURRENT ARTIST NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Daft Punk"
                  value={oldArtistInput}
                  onChange={(e) => setOldArtistInput(e.target.value)}
                  className="w-full h-8 px-3 bg-[#121620] border border-[#232b3b] focus:border-[#00f0ff] rounded text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">NEW ARTIST NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Daft Punk (Remastered)"
                  value={newArtistInput}
                  onChange={(e) => setNewArtistInput(e.target.value)}
                  className="w-full h-8 px-3 bg-[#121620] border border-[#232b3b] focus:border-[#00f0ff] rounded text-white font-mono focus:outline-none"
                />
              </div>

              {batchResultMsg && (
                <div className="p-2 rounded bg-[#162232] border border-[#00f0ff]/40 text-xs text-[#00f0ff] font-mono">
                  {batchResultMsg}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#1c222c]">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#161a22] hover:bg-[#1f2532] text-xs font-mono text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchUpdateArtist}
                className="px-4 py-1.5 rounded bg-[#00f0ff] hover:bg-[#38f4ff] text-xs font-mono font-bold text-black cursor-pointer shadow-md active:scale-95 transition-all"
              >
                Update All Rows
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
