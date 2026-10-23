// apps/desktop/src/renderer/components/cockpit/ForgeViewport.tsx
import React, { useMemo } from 'react';
import { VisualizerScene, DynamicsMode } from 'visual-engine';
import { useResonanceStore } from '../../store/useResonanceStore.js';

export interface ForgeViewportProps {
  audioElement: HTMLAudioElement | null;
  coverArtUrl: string | null;
}

export const ForgeViewport: React.FC<ForgeViewportProps> = ({ audioElement, coverArtUrl }) => {
  const dynamicsMode = useResonanceStore((s) => s.dynamicsMode);
  const bands = useResonanceStore((s) => s.bands);
  const setBands = useResonanceStore((s) => s.setBands);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);

  // Active word calculation for real-time kinetic overlay
  const activeWord = useMemo(() => {
    if (!activeLyrics || activeLyrics.length === 0) return null;
    return activeLyrics.find((w) => currentTime >= w.start && currentTime <= w.end) || null;
  }, [activeLyrics, currentTime]);

  return (
    <div className="w-full h-full bg-[#05070a] flex items-center justify-center relative overflow-hidden select-none">
      {/* 3D WebGL Canvas Scene */}
      <div className="absolute inset-0">
        <VisualizerScene
          audioElement={audioElement}
          dynamicsMode={dynamicsMode}
          coverArtUrl={coverArtUrl}
          onBandsUpdate={(newBands) => setBands(newBands)}
        />
      </div>

      {/* Cybernetic Telemetry HUD Overlay (Top-Left) */}
      <div className="absolute top-4 left-4 z-10 font-mono text-[10px] space-y-1 bg-black/60 p-2.5 rounded border border-[#1c222c] backdrop-blur-xs pointer-events-none">
        <div className="flex justify-between space-x-4 text-zinc-400">
          <span>PIPELINE</span>
          <span className="text-[#00f0ff] font-bold">ZERO-ZERO GPU</span>
        </div>
        <div className="flex justify-between space-x-4 text-zinc-400">
          <span>SUB-BASS RMS</span>
          <span className="text-cyan-400">{(bands.bass * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between space-x-4 text-zinc-400">
          <span>MID HARMONICS</span>
          <span className="text-yellow-400">{(bands.mid * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between space-x-4 text-zinc-400">
          <span>TREBLE JITTER</span>
          <span className="text-magenta-400">{(bands.treble * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Kinetic Typography Manifestation (Center) */}
      {activeWord && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            className="text-4xl md:text-5xl font-black font-mono tracking-wider text-white text-center transition-transform duration-75"
            style={{
              transform: `scale(${1.0 + bands.bass * 0.45})`,
              textShadow: `0 0 25px rgba(0, 240, 255, ${0.4 + bands.mid * 0.6}), 0 0 60px rgba(0, 240, 255, 0.3)`,
              filter: `drop-shadow(0 0 10px #00f0ff)`,
            }}
          >
            {activeWord.word}
          </div>
        </div>
      )}

      {/* Now Playing Backdrop Badge (Bottom-Left) */}
      {selectedTrack && (
        <div className="absolute bottom-4 left-4 z-10 font-mono text-xs bg-black/70 px-3 py-1.5 rounded border border-[#1e2533] backdrop-blur-xs flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-white font-bold truncate max-w-xs">{selectedTrack.title || selectedTrack.file_name}</span>
          <span className="text-zinc-500">—</span>
          <span className="text-[#00f0ff] truncate max-w-xs">{selectedTrack.artist_name || 'Unknown Artist'}</span>
        </div>
      )}
    </div>
  );
};
