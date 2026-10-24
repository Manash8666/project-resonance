// apps/desktop/src/renderer/components/cockpit/VaultPane/components/VaultCardGrid.tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Sparkles, Activity } from 'lucide-react';
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
    if (!ms) return '01:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getWaveformPeaks = (track: Track): number[] => {
    if (track.waveform_peaks) {
      try {
        const parsed = Array.isArray(track.waveform_peaks)
          ? track.waveform_peaks
          : JSON.parse(track.waveform_peaks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 32).map(Number);
        }
      } catch {
        // Fallback
      }
    }
    // Deterministic pseudo-peaks
    const synth: number[] = [];
    const seed = (track.id || 1) * 23;
    for (let i = 0; i < 32; i++) {
      const v = 0.2 + 0.7 * Math.abs(Math.sin((i + seed) * 0.22) * Math.cos(i * 0.38));
      synth.push(parseFloat(v.toFixed(2)));
    }
    return synth;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 overflow-y-auto h-full font-mono">
      {tracks.map((track) => {
        const isSelected = track.id === selectedTrackId;
        const peaks = getWaveformPeaks(track);

        return (
          <motion.div
            key={track.id}
            data-track-card
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            onClick={() => onSelect(track)}
            onDoubleClick={() => onDoubleClick(track)}
            className={`group flex flex-col rounded-md border transition-all duration-200 cursor-pointer overflow-hidden p-1.5 select-none ${
              isSelected
                ? 'bg-[#00ffff]/10 border-[#00ffff] shadow-[0_0_16px_rgba(0,255,255,0.25)] ring-1 ring-[#00ffff]/40'
                : 'bg-[#0a0a0a] border-[#27272a] hover:border-[#00ffff]/50 hover:bg-[#111111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
            }`}
          >
            {/* Thumbnail: High-Density Acoustic Waveform & Visual Artwork */}
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#111114] via-[#0d121a] to-[#080a0e] rounded border border-[#27272a] relative flex items-center justify-center overflow-hidden shadow-inner">
              {/* Background Waveform Bars */}
              <div className="absolute inset-0 flex items-center justify-between px-2.5 gap-0.5 opacity-60 group-hover:opacity-85 transition-opacity">
                {peaks.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-xs transition-all duration-150"
                    style={{
                      height: `${Math.max(15, p * 85)}%`,
                      backgroundColor:
                        track.has_lyrics === 1
                          ? isSelected
                            ? '#00ffff'
                            : '#f59e0b'
                          : isSelected
                          ? '#00ffff'
                          : '#10b981',
                    }}
                  />
                ))}
              </div>

              {/* Top-Left VIP Badge */}
              <div className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-amber-500/40 flex items-center gap-0.5 z-10">
                <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                <span className="text-[8px] font-bold text-amber-300">VIP</span>
              </div>

              {/* Center Play Overlay on Hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs z-20">
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
                  className="w-9 h-9 rounded-full bg-[#00ffff] hover:bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Play Track"
                >
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                </button>
              </div>

              {/* Bottom Right Duration Badge */}
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-xs text-[9px] font-mono text-zinc-300 border border-zinc-800 flex items-center gap-1 z-10">
                <span>{formatDuration(track.duration_ms)}</span>
              </div>

              {/* Bottom Left Status Tag */}
              <div className="absolute bottom-1.5 left-1.5 z-10">
                {track.has_lyrics === 1 ? (
                  <span className="px-1 py-0.2 rounded bg-black/80 border border-[#00ffff]/60 text-[8px] font-bold text-[#00ffff]">
                    [VOC]
                  </span>
                ) : (
                  <span className="px-1 py-0.2 rounded bg-black/80 border border-emerald-500/60 text-[8px] font-bold text-emerald-400">
                    [BEAT]
                  </span>
                )}
              </div>
            </div>

            {/* Title & Artist Info */}
            <div className="mt-2 px-1">
              <h4
                className={`text-[11px] font-bold truncate leading-tight uppercase tracking-wider transition-colors ${
                  isSelected ? 'text-[#00ffff]' : 'text-white group-hover:text-[#00ffff]'
                }`}
              >
                {track.title || track.file_name}
              </h4>
              <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
                <span className="truncate max-w-[75%]">{track.artist_name || 'Resonance Acoustic'}</span>
                <span className="text-[9px] text-zinc-500 font-mono">48kHz</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
