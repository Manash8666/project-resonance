import React, { useMemo } from 'react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { audioEngine } from '../../../audio/AudioEngine.js';
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

  const handleTogglePlay = onTogglePlay ?? (async () => {
    const el = audioEngine.getAudioElement();
    if ((!el.src || el.src === window.location.href) && selectedTrack) {
      audioEngine.loadTrack(selectedTrack.file_path);
    }
    await audioEngine.toggle();
  });
  const handleSeek = onSeek ?? ((t: number) => audioEngine.seek(t));
  const handleVolumeChange = onVolumeChange ?? ((v: number) => audioEngine.setVolume(v));

  const [localPeaks, setLocalPeaks] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    if (!selectedTrack?.id) {
      setLocalPeaks(null);
      return;
    }
    if (selectedTrack.waveform_peaks) {
      try {
        const p = Array.isArray(selectedTrack.waveform_peaks)
          ? selectedTrack.waveform_peaks
          : JSON.parse(selectedTrack.waveform_peaks);
        setLocalPeaks(p);
        return;
      } catch {
        // Fallback
      }
    }
    window.resonance?.getWaveform?.(selectedTrack.id)
      .then((peaks) => {
        if (peaks && peaks.length > 0) {
          setLocalPeaks(peaks);
        } else {
          // Generate deterministic 160-point acoustic profile seeded by track
          const synthPeaks: number[] = [];
          const seed = selectedTrack.id * 17 + (selectedTrack.duration_ms || 180000);
          for (let i = 0; i < 160; i++) {
            const val = 0.2 + 0.7 * Math.abs(Math.sin((i + seed) * 0.15) * Math.cos(i * 0.35 + seed * 0.05));
            synthPeaks.push(parseFloat(val.toFixed(3)));
          }
          setLocalPeaks(synthPeaks);
          void window.resonance?.saveWaveform?.(selectedTrack.id, synthPeaks);
        }
      })
      .catch(() => setLocalPeaks(null));
  }, [selectedTrack?.id, selectedTrack?.waveform_peaks]);

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
    handleSeek(newTime);
  };

  return (
    <div className="h-16 bg-[#0a0c10] border-t border-[#1c222c] flex items-center justify-between px-5 font-mono select-none z-30">
      {/* Left: Play/Pause & Now Playing Info */}
      <div className="flex items-center gap-3 w-72">
        <button
          onClick={handleTogglePlay}
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
      <div className="flex-1 max-w-2xl flex items-center gap-3 text-xs text-zinc-400 px-4">
        <span className="w-10 text-right">{formatSeconds(currentTime)}</span>
        <div className="relative flex-1 flex items-center h-10">
          {/* Cybernetic Waveform Preview Track Behind Slider */}
          <WaveformPreview peaks={localPeaks} currentTime={currentTime} duration={duration} />

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
      <div className="flex items-center gap-4">
        {/* 3-Band RMS LED VU Meters */}
        <div className="flex items-center gap-1.5 bg-[#080b10] border border-[#1b2230] rounded px-2.5 py-1 text-[9px] font-mono shadow-inner">
          <div className="flex flex-col items-center w-8 gap-1">
            <span className="text-zinc-400 font-bold tracking-wider">SUB</span>
            <div className="w-2.5 h-6 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-cyan-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.bass * 100))}%` }}
              />
            </div>
          </div>

          <div className="w-px h-7 bg-[#1c2433] mx-0.5" />

          <div className="flex flex-col items-center w-8 gap-1">
            <span className="text-zinc-400 font-bold tracking-wider">MID</span>
            <div className="w-2.5 h-6 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-yellow-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.mid * 100))}%` }}
              />
            </div>
          </div>

          <div className="w-px h-7 bg-[#1c2433] mx-0.5" />

          <div className="flex flex-col items-center w-8 gap-1">
            <span className="text-zinc-400 font-bold tracking-wider">AIR</span>
            <div className="w-2.5 h-6 bg-[#121620] rounded-xs border border-[#1e2533] flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-magenta-400 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(bands.treble * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-2 bg-[#080b10] border border-[#1b2230] rounded px-3 py-1.5 shadow-inner">
          <span className="text-[10px] text-zinc-400 font-bold tracking-wider">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              handleVolumeChange(v);
            }}
            className="w-16 h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
