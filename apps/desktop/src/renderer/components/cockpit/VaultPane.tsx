// apps/desktop/src/renderer/components/cockpit/VaultPane.tsx
import React, { useRef, useState } from 'react';
import { List } from 'react-window';
import { useResonanceStore } from '../../store/useResonanceStore.js';
import type { Track } from '../../types/track.js';

export const VaultPane: React.FC<{ onPlayTrack?: (track: Track) => void }> = ({ onPlayTrack }) => {
  const tracks = useResonanceStore((s) => s.tracks);
  const selectedTrackId = useResonanceStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useResonanceStore((s) => s.setSelectedTrackId);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);

  const containerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const formatDuration = (ms: number | null): string => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (track: Track) => {
    setSelectedTrackId(track.id);
    setSelectedTrack(track);
  };

  const commitEditing = async () => {
    if (!editingCell) return;
    try {
      await window.resonance.updateField(editingCell.id, editingCell.field, editValue.trim() || null);
      useResonanceStore.getState().setTracks(
        tracks.map((t) => (t.id === editingCell.id ? { ...t, [editingCell.field]: editValue.trim() || null } : t))
      );
    } catch (err) {
      console.error('Failed to update field:', err);
    } finally {
      setEditingCell(null);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#080a0e] text-zinc-300 font-mono select-none overflow-hidden">
      {/* Column Headers */}
      <div className="h-8 bg-[#0d1017] border-b border-[#1c222c] flex items-center px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        <span className="w-8">#</span>
        <span className="flex-1">Title</span>
        <span className="w-28">Artist</span>
        <span className="w-16 text-right">Time</span>
      </div>

      {/* Virtualized Rows */}
      <div className="flex-1 min-h-0">
        {tracks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs p-4 text-center">
            <span>No tracks indexed.</span>
            <span className="text-[10px] text-zinc-700 mt-1">Click "Scan Music Folder" in top bar.</span>
          </div>
        ) : (
          <List
            rowCount={tracks.length}
            rowHeight={36}
            rowComponent={({ index, style }: { index: number; style: React.CSSProperties }) => {
              const track = tracks[index];
              if (!track) return null;
              const isSelected = track.id === selectedTrackId;

              return (
                <div
                  style={style}
                  onClick={() => handleSelect(track)}
                  onDoubleClick={() => onPlayTrack?.(track)}
                  className={`flex items-center px-3 text-xs border-b border-[#141822] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#14233a] border-l-2 border-l-[#00f0ff] text-white shadow-xs'
                      : index % 2 === 0
                      ? 'bg-[#08090d] hover:bg-[#12161f]'
                      : 'bg-[#0a0c10] hover:bg-[#12161f]'
                  }`}
                >
                  <span className="w-8 text-[10px] text-zinc-600">{index + 1}</span>

                  <div
                    className="flex-1 flex items-center space-x-2 truncate pr-2"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingCell({ id: track.id, field: 'title' });
                      setEditValue(track.title || track.file_name);
                    }}
                  >
                    {editingCell?.id === track.id && editingCell.field === 'title' ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditing();
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="w-full bg-[#1e2736] border border-[#00f0ff] px-1.5 py-0.5 rounded text-xs text-white focus:outline-none"
                      />
                    ) : (
                      <>
                        <span className={`truncate ${isSelected ? 'text-[#00f0ff] font-bold' : 'text-zinc-200'}`}>
                          {track.title || track.file_name}
                        </span>
                        {track.has_lyrics === 1 && (
                          <span className="text-[9px] font-bold px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 shrink-0">
                            VOCAL
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <span className="w-28 truncate text-zinc-400 text-[11px]">{track.artist_name || 'Unknown'}</span>
                  <span className="w-16 text-right text-zinc-500 text-[10px] font-mono">
                    {formatDuration(track.duration_ms)}
                  </span>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
