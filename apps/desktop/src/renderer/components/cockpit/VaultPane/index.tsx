// apps/desktop/src/renderer/components/cockpit/VaultPane/index.tsx
import React, { useRef, useState } from 'react';
import { List } from 'react-window';
import { LayoutGrid, List as LucideList, Search, Folder, Music2, Mic2, Disc3 } from 'lucide-react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { audioEngine } from '../../../audio/AudioEngine.js';
import type { Track } from '../../../types/track.js';
import { VaultRow } from './components/VaultRow.js';
import { VaultCardGrid } from './components/VaultCardGrid.js';

export const VaultPane: React.FC<{ onPlayTrack?: (track: Track) => void }> = ({ onPlayTrack }) => {
  const tracks = useResonanceStore((s) => s.tracks);
  const searchQuery = useResonanceStore((s) => s.searchQuery);
  const setSearchQuery = useResonanceStore((s) => s.setSearchQuery);
  const selectedTrackId = useResonanceStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useResonanceStore((s) => s.setSelectedTrackId);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);

  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [activeFolder, setActiveFolder] = useState<'mine' | 'vocal' | 'instrumental' | 'playlists'>('mine');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); // Default visual grid
  const [aspectFilter, setAspectFilter] = useState<'all' | '16:9' | '9:16'>('all');

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await window.resonance.searchTracks(searchQuery.trim(), 200);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('FTS5 Search error:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const baseTracks = searchResults !== null ? searchResults : tracks;

  const filteredTracks = React.useMemo(() => {
    if (activeFolder === 'vocal') {
      return baseTracks.filter((t) => t.has_lyrics === 1);
    }
    if (activeFolder === 'instrumental') {
      return baseTracks.filter((t) => !t.has_lyrics || t.has_lyrics === 0);
    }
    return baseTracks;
  }, [baseTracks, activeFolder]);

  const totalDurationMs = React.useMemo(() => {
    return filteredTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0);
  }, [filteredTracks]);

  const formatTotalTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSelect = (track: Track) => {
    setSelectedTrackId(track.id);
    setSelectedTrack(track);
    void audioEngine.loadTrack(track.file_path);
  };

  const handlePlay = (track: Track) => {
    handleSelect(track);
    if (onPlayTrack) {
      onPlayTrack(track);
    } else {
      void audioEngine.loadTrack(track.file_path).then(() => {
        void audioEngine.play();
      });
    }
  };

  const handleDoubleClick = (track: Track) => {
    handlePlay(track);
  };

  const handleStartEdit = (id: number, field: string, initialVal: string) => {
    setEditingCell({ id, field });
    setEditValue(initialVal);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    try {
      await window.resonance.updateField(editingCell.id, editingCell.field, editValue);
      useResonanceStore.setState((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === editingCell.id ? { ...t, [editingCell.field]: editValue } : t
        ),
        selectedTrack:
          state.selectedTrack?.id === editingCell.id
            ? { ...state.selectedTrack, [editingCell.field]: editValue }
            : state.selectedTrack,
      }));
    } catch (err) {
      console.error('Failed to update metadata tag:', err);
    } finally {
      setEditingCell(null);
    }
  };

  const vocalCount = baseTracks.filter((t) => t.has_lyrics === 1).length;
  const instCount = baseTracks.length - vocalCount;

  return (
    <div ref={containerRef} className="flex h-full bg-[#050505] font-mono select-none overflow-hidden border-r border-[#27272a]">
      {/* ─── Left Sub-Sidebar (Width: 100px) ─── */}
      <div className="w-[100px] bg-[#0a0a0a] border-r border-[#27272a] flex flex-col py-2 px-1 gap-1 shrink-0 text-[10px]">
        <span className="text-[9px] font-bold text-zinc-500 uppercase px-1.5 mb-1 tracking-widest">
          VAULT
        </span>

        <button
          onClick={() => setActiveFolder('mine')}
          className={`px-1.5 py-1.5 rounded text-left transition-all flex items-center justify-between cursor-pointer ${
            activeFolder === 'mine'
              ? 'bg-[#18181b] text-[#00ffff] border-l-2 border-[#00ffff] font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-[#111111]'
          }`}
        >
          <span className="truncate">Mine</span>
          <span className="text-[9px] text-zinc-500 font-mono">{baseTracks.length}</span>
        </button>

        <button
          onClick={() => setActiveFolder('vocal')}
          className={`px-1.5 py-1.5 rounded text-left transition-all flex items-center justify-between cursor-pointer ${
            activeFolder === 'vocal'
              ? 'bg-[#18181b] text-[#00ffff] border-l-2 border-[#00ffff] font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-[#111111]'
          }`}
        >
          <span className="truncate">Vocals</span>
          <span className="text-[9px] text-amber-400 font-mono font-bold">{vocalCount}</span>
        </button>

        <button
          onClick={() => setActiveFolder('instrumental')}
          className={`px-1.5 py-1.5 rounded text-left transition-all flex items-center justify-between cursor-pointer ${
            activeFolder === 'instrumental'
              ? 'bg-[#18181b] text-[#00ffff] border-l-2 border-[#00ffff] font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-[#111111]'
          }`}
        >
          <span className="truncate">Beats</span>
          <span className="text-[9px] text-emerald-400 font-mono font-bold">{instCount}</span>
        </button>

        <button
          onClick={() => setActiveFolder('playlists')}
          className={`px-1.5 py-1.5 rounded text-left transition-all flex items-center justify-between cursor-pointer ${
            activeFolder === 'playlists'
              ? 'bg-[#18181b] text-[#00ffff] border-l-2 border-[#00ffff] font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-[#111111]'
          }`}
        >
          <span className="truncate">Playlists</span>
          <span className="text-[9px] text-zinc-600 font-mono">0</span>
        </button>
      </div>

      {/* ─── Main Asset Browser Body ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        {/* Top Search Bar & Filter Header */}
        <div className="p-2 bg-[#0a0a0a] border-b border-[#27272a] flex flex-col gap-1.5 shrink-0">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audio assets..."
              className="w-full bg-[#111111] border border-[#27272a] focus:border-[#00ffff] rounded pl-7 pr-7 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-0 bottom-0 flex items-center px-1 text-xs text-zinc-500 hover:text-[#00ffff] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills & View Switcher */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 uppercase tracking-wider text-[9px]">Aspect:</span>
              {(['all', '16:9', '9:16'] as const).map((asp) => (
                <button
                  key={asp}
                  onClick={() => setAspectFilter(asp)}
                  className={`px-1.5 py-0.2 rounded uppercase cursor-pointer transition-colors ${
                    aspectFilter === asp
                      ? 'bg-[#18181b] text-[#00ffff] border border-[#00ffff]/50 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {asp}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Grid vs Table */}
            <div className="flex items-center gap-1 bg-[#111111] p-0.5 rounded border border-[#27272a]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-[#00ffff] text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-[#00ffff] text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
                title="Table Row View"
              >
                <LucideList className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Grid vs Table */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {filteredTracks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs p-4 text-center">
              <span>No matching tracks in "{activeFolder}".</span>
              <span className="text-[10px] text-zinc-700 mt-1">Use "Scan Folder" in top bar to index audio.</span>
            </div>
          ) : viewMode === 'grid' ? (
            <VaultCardGrid
              tracks={filteredTracks}
              selectedTrackId={selectedTrackId}
              onSelect={handleSelect}
              onDoubleClick={handleDoubleClick}
              onPlay={handlePlay}
            />
          ) : (
            /* Table Row View */
            <div className="h-full flex flex-col">
              <div className="h-7 bg-[#0a0a0a] border-b border-[#27272a] flex items-center px-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
                <span className="w-8">#</span>
                <span className="flex-1">Title</span>
                <span className="w-24">Artist</span>
                <span className="w-14 text-right">Time</span>
              </div>
              <div className="flex-1 min-h-0">
                <List
                  rowCount={filteredTracks.length}
                  rowHeight={36}
                  rowProps={{} as any}
                  rowComponent={({ index, style }: { index: number; style: React.CSSProperties }) => {
                    const track = filteredTracks[index];
                    if (!track) return null;
                    const isSelected = track.id === selectedTrackId;

                    return (
                      <VaultRow
                        key={track.id}
                        track={track}
                        style={style}
                        isSelected={isSelected}
                        isEven={index % 2 === 0}
                        editingField={editingCell?.id === track.id ? editingCell.field : null}
                        editValue={editValue}
                        onSelect={() => handleSelect(track)}
                        onDoubleClick={() => handleDoubleClick(track)}
                        onStartEdit={(field, val) => handleStartEdit(track.id, field, val)}
                        onEditChange={(val) => setEditValue(val)}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setEditingCell(null)}
                      />
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Vault Footer Telemetry Bar */}
        <div className="h-6 bg-[#0a0a0a] border-t border-[#27272a] px-3 flex items-center justify-between text-[9px] text-zinc-500 font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffff]" />
            <span>{filteredTracks.length} ASSETS READY</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">TOTAL: {formatTotalTime(totalDurationMs)}</span>
        </div>
      </div>
    </div>
  );
};
