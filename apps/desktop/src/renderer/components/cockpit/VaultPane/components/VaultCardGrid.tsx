// apps/desktop/src/renderer/components/cockpit/VaultPane/components/VaultCardGrid.tsx
import React from 'react';
import { Play, Download, Sparkles, Music2, Activity } from 'lucide-react';
import type { Track } from '../../../../types/track.js';

export interface VaultCardGridProps {
  tracks: Track[];
  selectedTrackId: number | null;
  onSelect: (track: Track) => void;
  onDoubleClick: (track: Track) => void;
  onPlay?: (track: Track) => void;
}

export const VaultCardGrid: React.FC<VaultCardGridProps> = ({
  tracks,
  selectedTrackId,
  onSelect,
  onDoubleClick,
  onPlay,
}) => {
  const formatDuration = (ms: number | null): string => {
    if (!ms) return '00:10';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Curated artistic gradient themes matching Filmora's visual cards (Travel, Neon, Cyber)
  const getThumbnailTheme = (id: number, idx: number) => {
    const themes = [
      {
        bg: 'bg-gradient-to-br from-[#1a1c2e] via-[#0f283d] to-[#0a1520]',
        accent: '#00f0ff',
        type: 'neon',
        label: 'NEURAL GRID',
      },
      {
        bg: 'bg-gradient-to-br from-[#2a1b18] via-[#1f2937] to-[#0b1928]',
        accent: '#f59e0b',
        type: 'coastal',
        label: 'TRAVEL MEMORIES',
      },
      {
        bg: 'bg-gradient-to-br from-[#1b152d] via-[#131b2e] to-[#090d16]',
        accent: '#d946ef',
        type: 'synth',
        label: 'DYNAMIC TEXT',
      },
    ];
    return themes[idx % themes.length];
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 overflow-y-auto h-full font-mono">
      {tracks.map((track, idx) => {
        const isSelected = track.id === selectedTrackId;
        const theme = getThumbnailTheme(track.id, idx);

        return (
          <div
            key={track.id}
            data-track-card
            onClick={() => onSelect(track)}
            onDoubleClick={() => onDoubleClick(track)}
            className={`group flex flex-col rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden p-1.5 ${
              isSelected
                ? 'bg-[#121c2d] border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-[#00f0ff]/50'
                : 'bg-[#0a0d14] border-[#1c2433] hover:border-[#00f0ff]/40 hover:bg-[#0f1420]'
            }`}
          >
            {/* Card Thumbnail Box with Filmora Aesthetic */}
            <div
              className={`w-full aspect-[4/3] ${theme.bg} rounded-md border border-[#1e2736] relative flex items-center justify-center overflow-hidden shadow-inner`}
            >
              {/* Rich Procedural Visual Elements */}
              {theme.type === 'coastal' ? (
                /* Coastal Travel Graphic (Matching Filmora beach video preview) */
                <div className="absolute inset-0 flex flex-col justify-end overflow-hidden opacity-85">
                  <div className="h-1/2 w-full bg-gradient-to-t from-[#1d4ed8]/40 via-[#0284c7]/20 to-transparent" />
                  <div className="absolute top-2 left-3 w-8 h-8 rounded-full bg-amber-400/30 blur-xs" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-black tracking-widest text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      JOURNEY
                    </span>
                  </div>
                </div>
              ) : theme.type === 'synth' ? (
                /* Neon Equalizer Spectrum Visual */
                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-75 px-4">
                  {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-fuchsia-600 to-[#00f0ff] rounded-xs"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              ) : (
                /* Cyber Grid & Horizon */
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-70">
                  <div className="w-24 h-24 border border-dashed border-[#00f0ff]/30 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute w-12 h-12 border border-[#00f0ff]/40 rounded-full" />
                  <Activity className="w-5 h-5 text-[#00f0ff]" />
                </div>
              )}

              {/* Top-Left VIP/Diamond Badge (Filmora reference: Pink/Gold VIP icon) */}
              <div className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-black/70 backdrop-blur-xs border border-amber-500/40 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                <span className="text-[8px] font-bold text-amber-300">VIP</span>
              </div>

              {/* Center Play Overlay on Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPlay) {
                      onPlay(track);
                    } else {
                      onDoubleClick(track);
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-[#00f0ff] hover:bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Play Track"
                >
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                </button>
              </div>

              {/* Bottom Left Duration Badge (Filmora reference e.g. 00:10) */}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-[9px] font-mono text-zinc-200 border border-zinc-800 flex items-center gap-1">
                <span>{formatDuration(track.duration_ms)}</span>
              </div>

              {/* Bottom Right Download / Ready Icon (Filmora reference: download arrow) */}
              <div className="absolute bottom-1.5 right-1.5 p-1 rounded bg-black/80 backdrop-blur-xs border border-zinc-800 text-zinc-400 group-hover:text-[#00f0ff] transition-colors">
                <Download className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Title & Artist Info */}
            <div className="mt-2 px-1">
              <h4
                className={`text-[11px] font-bold truncate leading-tight transition-colors ${
                  isSelected ? 'text-[#00f0ff]' : 'text-zinc-200 group-hover:text-white'
                }`}
              >
                {track.title || track.file_name}
              </h4>
              <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                <span className="truncate max-w-[70%]">{track.artist_name || 'Resonance Core'}</span>
                {track.has_lyrics === 1 ? (
                  <span className="px-1 py-0.2 rounded bg-fuchsia-950/80 border border-fuchsia-700/60 text-[8px] font-bold text-fuchsia-300">
                    VOC
                  </span>
                ) : (
                  <span className="px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/60 text-[8px] font-bold text-emerald-300">
                    BEAT
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
