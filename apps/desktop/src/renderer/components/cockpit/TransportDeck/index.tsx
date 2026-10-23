// apps/desktop/src/renderer/components/cockpit/TransportDeck/index.tsx
import React, { useMemo } from 'react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { WaveformPreview } from './components/WaveformPreview.js';

export interface TransportDeckProps {
  onTogglePlay?: () => void;
  onSeek?: (timeInSeconds: number) => void;
  onVolumeChange?: (vol: number) => void;
}

export const TransportDeck: React.FC<TransportDeckProps> = ({
  onTogglePlay,
  onSeek,
  onVolumeChange,
}) => {
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);
  const volume = useResonanceStore((s) => s.volume);
  const setVolume = useResonanceStore((s) => s.setVolume);
  const setScrubbing = useResonanceStore((s) => s.setScrubbing);
  const seekTo = useResonanceStore((s) => s.seekTo);
  const bands = useResonanceStore((s) => s.bands);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);

  // Parse cached waveform peaks if present on selectedTrack
  const parsedPeaks = useMemo<number[] | null>(() => {
    if (!selectedTrack?.waveform_peaks) return null;
    try {
      if (Array.isArray(selectedTrack.waveform_peaks)) {
        return selectedTrack.waveform_peaks as number[];
      }
      return JSON.parse(selectedTrack.waveform_peaks);
    } catch {
      return null;
    }
  }, [selectedTrack?.waveform_peaks]);

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setScrubbing(true);
    seekTo(newTime);
    onSeek?.(newTime);
  };

  return (
    <div className="h-16 bg-[#0a0c10] border-t border-[#1c222c] flex items-center justify-between px-5 font-mono select-none z-30">
      {/* Left: Play/Pause & Now Playing Info */}
      <div className="flex items-center space-x-4 w-72">
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full bg-[#121620] hover:bg-[#1c2333] border border-[#232b3b] hover:border-[#00f0ff] flex items-center justify-center text-[#00f0ff] cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
        >
          {isPlaying ? (
            <span className="text-xs font-bold">❚❚</span>
          ) : (
            <span className="text-xs font-bold pl-0.5">▶</span>
          )}
        </button>

        <div className="flex flex-col overflow-hidden leading-tight">
          <span className="text-xs font-bold text-white truncate">
            {selectedTrack ? selectedTrack.title || selectedTrack.file_name : 'No Track Engaged'}
          </span>
          <span className="text-[11px] text-zinc-400 truncate">
            {selectedTrack ? selectedTrack.artist_name || 'Unknown Artist' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Center: Timeline Scrubber with Embedded Waveform Preview */}
      <div className="flex-1 max-w-2xl flex items-center space-x-3 text-xs text-zinc-400 px-4">
        <span className="w-10 text-right">{formatSeconds(currentTime)}</span>
        <div className="relative flex-1 flex items-center h-10">
          {/* Cybernetic Waveform Preview Track Behind Slider */}
          <WaveformPreview peaks={parsedPeaks} currentTime={currentTime} duration={duration} />

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSliderChange}
            onMouseDown={() => setScrubbing(true)}
            onMouseUp={() => setScrubbing(false)}
            className="w-full h-2 bg-transparent appearance-none cursor-pointer accent-[#00f0ff] z-10 focus:outline-none"
          />
        </div>
        <span className="w-10">{formatSeconds(duration)}</span>
      </div>

      {/* Right: Macro Bands LED VU Meters & Volume */}
      <div className="flex items-center space-x-6">
        {/* 3-Band RMS LED VU Meters */}
        <div className="flex items-center space-x-3 text-[10px]">
          <div className="flex flex-col items-center space-y-1">
            <span className="text-zinc-500 font-bold">SUB</span>
            <div className="w-3 h-8 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-cyan-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.bass * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <span className="text-zinc-500 font-bold">MID</span>
            <div className="w-3 h-8 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-yellow-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.mid * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center space-y-1">
            <span className="text-zinc-500 font-bold">AIR</span>
            <div className="w-3 h-8 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-magenta-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.treble * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-zinc-500 font-bold">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              onVolumeChange?.(v);
            }}
            className="w-16 h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
        </div>
      </div>
    </div>
  );
};
