// apps/desktop/src/renderer/components/cockpit/ForgeViewport/components/ImmersiveHUD.tsx
import React, { useState, useEffect } from 'react';
import { useResonanceStore } from '../../../../store/useResonanceStore.js';
import { audioEngine } from '../../../../audio/AudioEngine.js';

export interface ImmersiveHUDProps {
  isVisible: boolean;
  onExit: () => void;
}

export const ImmersiveHUD: React.FC<ImmersiveHUDProps> = ({ isVisible, onExit }) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);
  const bands = useResonanceStore((s) => s.bands);
  const volume = useResonanceStore((s) => s.volume);
  const setVolume = useResonanceStore((s) => s.setVolume);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePlay = async () => {
    const el = audioEngine.getAudioElement();
    if ((!el.src || el.src === window.location.href) && selectedTrack) {
      await audioEngine.loadTrack(selectedTrack.file_path);
    }
    await audioEngine.toggle();
  };

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <div className="bg-[#080c14]/85 backdrop-blur-2xl border border-[#00f0ff]/30 shadow-[0_0_35px_rgba(0,240,255,0.18)] rounded-full px-6 py-2.5 flex items-center space-x-6 text-zinc-100 select-none">
        {/* Track Title & Artist */}
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_10px_#00f0ff]" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs tracking-wider text-white max-w-[180px] truncate">
              {selectedTrack?.title || selectedTrack?.file_name || 'No Track Selected'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono max-w-[140px] truncate">
              {selectedTrack?.artist_name || 'Resonance Acoustic'}
            </span>
          </div>
        </div>

        {/* Live Audio Telemetry Mini-Bars */}
        <div className="flex items-end space-x-1 h-5 px-2 bg-[#0c101a]/60 rounded-md border border-zinc-800/80">
          <div
            className="w-1 bg-[#00f0ff] rounded-t transition-all duration-75"
            style={{ height: `${Math.max(15, bands.bass * 100)}%` }}
          />
          <div
            className="w-1 bg-[#38bdf8] rounded-t transition-all duration-75"
            style={{ height: `${Math.max(15, bands.mid * 100)}%` }}
          />
          <div
            className="w-1 bg-[#a855f7] rounded-t transition-all duration-75"
            style={{ height: `${Math.max(15, bands.treble * 100)}%` }}
          />
        </div>

        {/* Transport Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTogglePlay}
            className="w-8 h-8 rounded-full bg-[#00f0ff]/15 hover:bg-[#00f0ff]/30 border border-[#00f0ff]/60 flex items-center justify-center text-sm text-[#00f0ff] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.25)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <div className="text-[11px] font-mono text-zinc-300">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-500">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-400">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              audioEngine.setVolume(v);
            }}
            className="w-16 h-1 bg-[#161c28] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>

        {/* Exit Immersive Mode Button */}
        <button
          onClick={onExit}
          className="px-3 py-1 bg-[#121824] hover:bg-[#1a2335] border border-[#2b3548] hover:border-[#00f0ff]/60 text-[11px] text-zinc-300 hover:text-white rounded-full flex items-center space-x-1.5 transition-all cursor-pointer"
          title="Exit Immersive Mode (Esc or F)"
        >
          <span>EXIT</span>
          <kbd className="px-1.5 py-0.5 text-[9px] bg-black/50 border border-zinc-700 rounded text-[#00f0ff]">
            ESC
          </kbd>
        </button>
      </div>
    </div>
  );
};
