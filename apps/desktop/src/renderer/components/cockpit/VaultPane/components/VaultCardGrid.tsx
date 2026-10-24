// apps/desktop/src/renderer/components/cockpit/VaultPane/components/VaultCardGrid.tsx
import React from 'react';
import type { Track } from '../../../../types/track.js';

export interface VaultCardGridProps {
  tracks: Track[];
  selectedTrackId: number | null;
  onSelect: (track: Track) => void;
  onDoubleClick: (track: Track) => void;
}

export const VaultCardGrid: React.FC<VaultCardGridProps> = ({
  tracks,
  selectedTrackId,
  onSelect,
  onDoubleClick,
}) => {
  const formatDuration = (ms: number | null): string => {
    if (!ms) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInitials = (title?: string | null) => {
    if (!title) return 'PR';
    return title
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 overflow-y-auto h-full">
      {tracks.map((track) => {
        const isSelected = track.id === selectedTrackId;
        const initials = getInitials(track.title || track.file_name);

        return (
          <div
            key={track.id}
            onClick={() => onSelect(track)}
            onDoubleClick={() => onDoubleClick(track)}
            className={`group flex flex-col rounded-md border transition-all cursor-pointer overflow-hidden p-1.5 ${
              isSelected
                ? 'bg-[#14233a] border-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'bg-[#0b0e14] border-[#1c2433] hover:border-[#00f0ff]/50 hover:bg-[#10141d]'
            }`}
          >
            {/* Card Thumbnail Box with Duration Badge */}
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#121a26] via-[#090d14] to-[#06080b] rounded border border-[#1e2736] relative flex items-center justify-center overflow-hidden">
              {/* Geometric Background Graphic */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-16 h-16 rounded-full border border-dashed border-[#00f0ff]" />
              </div>

              {/* Center Emblem */}
              <div className="w-9 h-9 rounded bg-[#0a0f17] border border-[#00f0ff]/40 flex items-center justify-center shadow-md">
                <span className="font-mono text-xs font-bold text-[#00f0ff]">{initials}</span>
              </div>

              {/* Hover Play Action Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#00f0ff] text-black flex items-center justify-center pl-0.5 shadow-lg transform group-hover:scale-105 transition-transform">
                  ▶
                </div>
              </div>

              {/* Bottom Left Duration Badge (Filmora style e.g. 00:10) */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[9px] font-mono text-zinc-300 border border-zinc-800">
                {formatDuration(track.duration_ms)}
              </div>

              {/* Bottom Right Vocal / Action Badge */}
              <div className="absolute bottom-1 right-1">
                {track.has_lyrics === 1 ? (
                  <span className="px-1 py-0.2 rounded bg-fuchsia-950/80 border border-fuchsia-700/60 text-[8px] font-mono font-bold text-fuchsia-300">
                    VOC
                  </span>
                ) : (
                  <span className="px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/60 text-[8px] font-mono font-bold text-emerald-300">
                    BEAT
                  </span>
                )}
              </div>
            </div>

            {/* Title & Artist */}
            <div className="mt-1.5 px-0.5">
              <h4
                className={`text-[11px] font-bold truncate leading-tight ${
                  isSelected ? 'text-[#00f0ff]' : 'text-zinc-200 group-hover:text-white'
                }`}
              >
                {track.title || track.file_name}
              </h4>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {track.artist_name || 'Resonance Acoustic'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
