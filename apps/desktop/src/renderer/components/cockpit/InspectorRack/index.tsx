// apps/desktop/src/renderer/components/cockpit/InspectorRack/index.tsx
import React from 'react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { AlbumArtPreview } from './components/AlbumArtPreview.js';
import { ShaderTuning } from './components/ShaderTuning.js';

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
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);

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
          <AlbumArtPreview coverArtUrl={coverArtUrl} track={selectedTrack} />

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
                    <span
                      key={idx}
                      className="hover:text-[#00f0ff] transition-colors"
                      title={`${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s`}
                    >
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
      <ShaderTuning />
    </div>
  );
};
