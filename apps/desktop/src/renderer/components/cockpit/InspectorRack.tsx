// apps/desktop/src/renderer/components/cockpit/InspectorRack.tsx
import React, { useState } from 'react';
import { useResonanceStore } from '../../store/useResonanceStore.js';

export interface InspectorRackProps {
  coverArtUrl: string | null;
  onAutoTranscribe?: () => Promise<void>;
  isTranscribing?: boolean;
  transcriptionStatus?: string | null;
}

export const InspectorRack: React.FC<InspectorRackProps> = ({
  coverArtUrl,
  onAutoTranscribe,
  isTranscribing = false,
  transcriptionStatus = null,
}) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const shaderParams = useResonanceStore((s) => s.shaderParams);
  const updateShaderParam = useResonanceStore((s) => s.updateShaderParam);
  const dynamicsMode = useResonanceStore((s) => s.dynamicsMode);
  const setDynamicsMode = useResonanceStore((s) => s.setDynamicsMode);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);

  const formatTime = (ms: number | null): string => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0e] border-l border-[#1c222c] p-4 text-zinc-300 font-mono select-none overflow-y-auto space-y-5 text-xs">
      {/* Rack Title */}
      <div className="flex items-center justify-between border-b border-[#1c222c] pb-2">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          INSPECTOR & KINETICS
        </h2>
        <span className="text-[9px] text-[#00f0ff] bg-[#121a24] px-1.5 py-0.5 rounded border border-[#00f0ff]/30">
          CH-01
        </span>
      </div>

      {/* Selected Track Overview & Cover Art */}
      {selectedTrack ? (
        <div className="space-y-3">
          <div className="w-full aspect-square bg-[#0e121a] rounded border border-[#1e2533] overflow-hidden flex items-center justify-center relative shadow-lg">
            {coverArtUrl ? (
              <img src={coverArtUrl} alt="Cover Art" className="w-full h-full object-cover" />
            ) : (
              <div className="text-zinc-600 flex flex-col items-center space-y-1">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-[9px] uppercase">No Cover Art</span>
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <h3 className="font-bold text-white text-sm truncate">{selectedTrack.title || selectedTrack.file_name}</h3>
            <p className="text-xs text-[#00f0ff] truncate">{selectedTrack.artist_name || 'Unknown Artist'}</p>
            <p className="text-[11px] text-zinc-500 truncate">{selectedTrack.album_name || 'Unknown Album'}</p>
          </div>

          {/* AI Whisper Transcription Trigger */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onAutoTranscribe}
              disabled={isTranscribing}
              className={`w-full py-2 border font-mono font-bold text-xs rounded transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center space-x-2 ${
                selectedTrack.has_lyrics
                  ? 'bg-[#121f18] hover:bg-[#1a2d24] border-emerald-500/50 text-emerald-400'
                  : 'bg-[#181326] hover:bg-[#251d3b] border-fuchsia-500/50 text-fuchsia-400 hover:text-white'
              }`}
            >
              <span>
                {isTranscribing
                  ? '⚡ TRANSCRIBING VOCALS (WHISPER)...'
                  : selectedTrack.has_lyrics
                  ? '✓ VOCALS TRANSCRIBED (RE-RUN)'
                  : '⚡ AUTO-TRANSCRIBE VOCALS'}
              </span>
            </button>

            {transcriptionStatus && (
              <div className="p-2 rounded bg-[#10141f] border border-[#00f0ff]/40 text-[10px] text-[#00f0ff] font-mono leading-tight animate-pulse">
                {transcriptionStatus}
              </div>
            )}

            {activeLyrics && activeLyrics.length > 0 && (
              <div className="p-2 rounded bg-[#0b0e14] border border-[#1e2638] space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                  <span className="text-[#00f0ff] font-bold">KINETIC LYRICS</span>
                  <span className="text-emerald-400 font-bold">{activeLyrics.length} WORDS</span>
                </div>
                <div className="max-h-20 overflow-y-auto text-[10px] font-mono text-zinc-300 space-x-1 leading-relaxed">
                  {activeLyrics.slice(0, 30).map((w, idx) => (
                    <span key={idx} className="hover:text-[#00f0ff] transition-colors" title={`${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s`}>
                      {w.word}
                    </span>
                  ))}
                  {activeLyrics.length > 30 && <span className="text-zinc-600">...</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-zinc-600 text-xs py-6">
          <span>Select a track from the Vault to inspect telemetry.</span>
        </div>
      )}

      {/* Shader Calibration Dials */}
      <div className="space-y-3 border-t border-[#1c222c] pt-4">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Shader Calibration</h4>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Sub-Bass Extrusion</span>
            <span className="text-[#00f0ff]">{shaderParams.bassMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={shaderParams.bassMultiplier}
            onChange={(e) => updateShaderParam('bassMultiplier', parseFloat(e.target.value))}
            className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Mid Glow Intensity</span>
            <span className="text-[#00f0ff]">{shaderParams.midGlowIntensity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={shaderParams.midGlowIntensity}
            onChange={(e) => updateShaderParam('midGlowIntensity', parseFloat(e.target.value))}
            className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-400">Treble Camera Shake</span>
            <span className="text-[#00f0ff]">{(shaderParams.trebleShakeIntensity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={shaderParams.trebleShakeIntensity}
            onChange={(e) => updateShaderParam('trebleShakeIntensity', parseFloat(e.target.value))}
            className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
        </div>

        {/* Dynamics Mode Toggle */}
        <div className="pt-2">
          <label className="text-[10px] text-zinc-500 uppercase block mb-1.5">Dynamics Physics</label>
          <div className="grid grid-cols-3 gap-1 bg-[#10141c] p-1 rounded border border-[#1e2533] text-[10px] text-center font-bold">
            {(['ballistic', 'fluid', 'hybrid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDynamicsMode(mode)}
                className={`py-1 rounded uppercase transition-colors cursor-pointer ${
                  dynamicsMode === mode ? 'bg-[#00f0ff] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
