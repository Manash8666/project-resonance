// apps/desktop/src/renderer/components/cockpit/VaultPane/components/VaultRow.tsx
import React from 'react';
import type { Track } from '../../../../types/track.js';

export interface VaultRowProps {
  track: Track;
  style: React.CSSProperties;
  isSelected: boolean;
  isEven: boolean;
  editingField: string | null;
  editValue: string;
  onSelect: () => void;
  onDoubleClick: () => void;
  onStartEdit: (field: string, val: string) => void;
  onEditChange: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export const VaultRow: React.FC<VaultRowProps> = ({
  track,
  style,
  isSelected,
  isEven,
  editingField,
  editValue,
  onSelect,
  onDoubleClick,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}) => {
  const formatDuration = (ms: number | null): string => {
    if (!ms) return '--:--';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={style}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`flex items-center px-3 text-xs border-b border-[#141822] cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#14233a] border-l-2 border-l-[#00f0ff] text-white shadow-xs'
          : isEven
          ? 'bg-[#08090d] hover:bg-[#12161f]'
          : 'bg-[#0a0c10] hover:bg-[#12161f]'
      }`}
    >
      {/* Track Number & Vocal Badge */}
      <div className="w-10 text-zinc-500 font-mono text-[10px] flex items-center space-x-1 shrink-0">
        <span>{track.track_number ?? '-'}</span>
        {track.has_lyrics === 1 && (
          <span className="text-[8px] text-[#00f0ff] bg-[#00f0ff]/10 px-0.5 rounded border border-[#00f0ff]/30 font-bold">
            VOC
          </span>
        )}
      </div>

      {/* Title Field (Inline Editable) */}
      <div
        className="flex-1 truncate pr-2 font-medium"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit('title', track.title || track.file_name);
        }}
      >
        {editingField === 'title' ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="w-full bg-[#121620] border border-[#00f0ff] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
          />
        ) : (
          <span className={isSelected ? 'text-[#00f0ff] font-bold' : 'text-zinc-200'}>
            {track.title || track.file_name}
          </span>
        )}
      </div>

      {/* Artist Field */}
      <div
        className="w-24 text-zinc-400 truncate pr-2 text-[11px]"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit('artist_name', track.artist_name || '');
        }}
      >
        {editingField === 'artist_name' ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="w-full bg-[#121620] border border-[#00f0ff] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
          />
        ) : (
          <span>{track.artist_name || 'Unknown Artist'}</span>
        )}
      </div>

      {/* Duration */}
      <div className="w-14 text-right font-mono text-[10px] text-zinc-500">
        {formatDuration(track.duration_ms)}
      </div>
    </div>
  );
};
