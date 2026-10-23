// apps/desktop/src/renderer/components/cockpit/VaultPane/index.tsx
import React, { useRef, useState } from 'react';
import { List } from 'react-window';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import type { Track } from '../../../types/track.js';
import { VaultRow } from './components/VaultRow.js';

export const VaultPane: React.FC<{ onPlayTrack?: (track: Track) => void }> = ({ onPlayTrack }) => {
  const tracks = useResonanceStore((s) => s.tracks);
  const selectedTrackId = useResonanceStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useResonanceStore((s) => s.setSelectedTrackId);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);

  const containerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSelect = (track: Track) => {
    setSelectedTrackId(track.id);
    setSelectedTrack(track);
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

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#07090d] font-mono select-none overflow-hidden">
      {/* Vault Table Column Headers */}
      <div className="h-8 bg-[#0b0e14] border-b border-[#1c222c] flex items-center px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
        <span className="w-12">#</span>
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
            rowProps={{} as any}
            rowComponent={({ index, style }: { index: number; style: React.CSSProperties }) => {
              const track = tracks[index];
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
                  onDoubleClick={() => onPlayTrack?.(track)}
                  onStartEdit={(field, val) => handleStartEdit(track.id, field, val)}
                  onEditChange={(val) => setEditValue(val)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingCell(null)}
                />
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
