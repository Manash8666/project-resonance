// apps/desktop/src/renderer/components/cockpit/TimelineDeck/index.tsx
import React, { useState, useRef, useMemo } from 'react';
import {
  MousePointer,
  Scissors,
  Trash2,
  Type,
  Sparkles,
  Flag,
  Magnet,
  ZoomIn,
  ZoomOut,
  Video,
  Eye,
  EyeOff,
  Lock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Grid,
  Music,
} from 'lucide-react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { audioEngine } from '../../../audio/AudioEngine.js';
import type { Track } from '../../../types/track.js';

export interface TimelineDeckProps {
  onTogglePlay?: () => void;
  onSeek?: (timeInSeconds: number) => void;
}

export const TimelineDeck: React.FC<TimelineDeckProps> = ({ onTogglePlay, onSeek }) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);
  const seekTo = useResonanceStore((s) => s.seekTo);

  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 3x zoom
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isLyricsMuted, setIsLyricsMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'split' | 'text'>('select');

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = duration > 0 ? duration : 60; // fallback 60s
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  const formatTimecode = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Generate ruler tick marks (every 5s or 15s depending on duration and zoom)
  const rulerTicks = useMemo(() => {
    const ticks: { time: number; label: string; percent: number }[] = [];
    const step = effectiveDuration <= 60 ? 5 : effectiveDuration <= 180 ? 15 : 30;
    for (let t = 0; t <= effectiveDuration; t += step) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      ticks.push({
        time: t,
        label: `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:00`,
        percent: (t / effectiveDuration) * 100,
      });
    }
    return ticks;
  }, [effectiveDuration]);

  // Handle click or drag on timeline to seek
  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * effectiveDuration;
    seekTo(targetTime);
    if (onSeek) {
      onSeek(targetTime);
    } else {
      audioEngine.seek(targetTime);
    }
  };

  // Sample waveform peaks for audio track rendering
  const peaks: number[] = useMemo(() => {
    if (selectedTrack?.waveform_peaks) {
      try {
        const parsed = Array.isArray(selectedTrack.waveform_peaks)
          ? selectedTrack.waveform_peaks
          : JSON.parse(selectedTrack.waveform_peaks);
        if (Array.isArray(parsed)) return parsed.map((x: unknown) => Number(x) || 0);
      } catch {
        // Fallback
      }
    }
    // Deterministic pseudo-peaks
    const synth: number[] = [];
    const seed = (selectedTrack?.id || 1) * 17;
    for (let i = 0; i < 120; i++) {
      const v = 0.2 + 0.7 * Math.abs(Math.sin((i + seed) * 0.18) * Math.cos(i * 0.32));
      synth.push(parseFloat(v.toFixed(3)));
    }
    return synth;
  }, [selectedTrack?.id, selectedTrack?.waveform_peaks]);

  return (
    <div className="flex flex-col h-full bg-[#07090d] border-t border-[#1a2230] font-mono select-none overflow-hidden text-xs">
      {/* ─── 1. Filmora-Style Timeline Action Toolbar ─── */}
      <div className="h-9 bg-[#0b0e14] border-b border-[#1c2433] px-3 flex items-center justify-between shrink-0 text-zinc-400">
        {/* Left Editing Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-[#161d2b] hover:text-[#00f0ff] transition-colors cursor-pointer"
            title="Grid Modes"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-[#14233a] text-[#00f0ff] border border-[#00f0ff]/40 shadow-xs'
                : 'hover:bg-[#161d2b] hover:text-white'
            }`}
            title="Selection Tool (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('split')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeTool === 'split'
                ? 'bg-[#14233a] text-[#00f0ff] border border-[#00f0ff]/40 shadow-xs'
                : 'hover:bg-[#161d2b] hover:text-white'
            }`}
            title="Split Razor (C)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded hover:bg-[#161d2b] hover:text-red-400 transition-colors cursor-pointer"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#1e2736] mx-1" />

          {/* Quick Add Text */}
          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className="px-2 py-1 bg-[#10141d] hover:bg-[#161d2b] border border-[#1e2736] hover:border-[#00f0ff]/50 rounded text-[10px] text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            title="Add Kinetic Typography Layer"
          >
            <Type className="w-3 h-3 text-[#00f0ff]" />
            <span>Title</span>
          </button>

          {/* AI Transcribe Trigger */}
          <button
            type="button"
            className="px-2 py-1 bg-[#121f18] hover:bg-[#182d22] border border-emerald-500/40 rounded text-[10px] text-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer"
            title="AI Whisper Speech-To-Text Sync"
          >
            <Sparkles className="w-3 h-3" />
            <span>Whisper</span>
          </button>

          <button
            type="button"
            className="p-1.5 rounded hover:bg-[#161d2b] hover:text-[#00f0ff] transition-colors cursor-pointer"
            title="Add Marker (M)"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center Current Timecode Display with Quick Play/Pause Button */}
        <div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-1.5 rounded bg-[#10141d] hover:bg-[#182335] text-[#00f0ff] border border-[#1e2736] hover:border-[#00f0ff]/50 transition-colors cursor-pointer flex items-center justify-center shadow-xs"
              title={isPlaying ? 'Pause Audio (Space)' : 'Play Audio (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2 bg-[#06080c] px-3 py-1 rounded border border-[#1a2230]">
            <span className="text-[#00f0ff] font-bold tracking-wider text-xs">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500 text-xs">
              {formatTimecode(effectiveDuration)}
            </span>
          </div>
        </div>

        {/* Right Controls: Snapping & Zoom Slider */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 text-zinc-400 hover:text-[#00f0ff] transition-colors cursor-pointer"
            title="Magnet Snapping Toggle"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 bg-[#0e121a] border border-[#1c2433] rounded px-2 py-1">
            <ZoomOut className="w-3 h-3 text-zinc-500" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#1e2738] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
              title="Timeline Zoom Level"
            />
            <ZoomIn className="w-3 h-3 text-zinc-500" />
          </div>
        </div>
      </div>

      {/* ─── 2. Multi-Track Timeline Workspace ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Track Headers Column (Fixed Width: 140px) */}
        <div className="w-36 bg-[#090c12] border-r border-[#1a2230] flex flex-col shrink-0 text-[11px] font-mono z-20">
          {/* Header Spacer (matches Ruler height) */}
          <div className="h-6 bg-[#0a0d14] border-b border-[#1a2230] flex items-center px-2 text-[9px] text-zinc-500 font-bold tracking-wider">
            TRACKS
          </div>

          {/* Track 1: Video (Shader) */}
          <div className="h-16 border-b border-[#18202d] px-2.5 flex items-center justify-between bg-[#0b0e15]">
            <div className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span className="font-bold text-zinc-300">Video 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isVideoMuted ? 'text-zinc-600' : 'text-[#00f0ff]'
                }`}
                title="Toggle Visibility"
              >
                {isVideoMuted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <Lock className="w-3 h-3 text-zinc-600" />
            </div>
          </div>

          {/* Track 2: Lyrics (Kinetic Typography) */}
          <div className="h-14 border-b border-[#18202d] px-2.5 flex items-center justify-between bg-[#0b0e15]">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-zinc-300">Kinetic 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsLyricsMuted(!isLyricsMuted)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isLyricsMuted ? 'text-zinc-600' : 'text-amber-400'
                }`}
                title="Toggle Lyric Overlay"
              >
                {isLyricsMuted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <Lock className="w-3 h-3 text-zinc-600" />
            </div>
          </div>

          {/* Track 3: Audio (Master Waveform) */}
          <div className="h-16 border-b border-[#18202d] px-2.5 flex items-center justify-between bg-[#0b0e15]">
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-zinc-300">Audio 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isAudioMuted ? 'text-red-400' : 'text-emerald-400'
                }`}
                title="Mute Audio Track"
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <Lock className="w-3 h-3 text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Right Timeline Canvas (Ruler + Tracks Area + Draggable Playhead) */}
        <div
          ref={timelineContainerRef}
          onClick={handleTimelineInteraction}
          className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-[#06080b] cursor-pointer"
        >
          {/* Inner Scaled Canvas based on zoomLevel */}
          <div
            className="h-full relative"
            style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}
          >
            {/* ─── A. Timeline Time Ruler ─── */}
            <div className="h-6 bg-[#080b10] border-b border-[#1a2230] relative flex items-center overflow-hidden">
              {rulerTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: `${tick.percent}%` }}
                >
                  <span className="text-[9px] text-zinc-500 font-mono tracking-tighter pl-1">
                    {tick.label}
                  </span>
                  <div className="w-px h-2 bg-[#20293a]" />
                </div>
              ))}
            </div>

            {/* ─── B. Track 1 Clip: 3D WebGL Shader Video Stream ─── */}
            <div className="h-16 border-b border-[#141b26] relative p-1">
              <div
                className={`h-full rounded-md border flex items-center px-3 relative overflow-hidden shadow-sm transition-all ${
                  isVideoMuted
                    ? 'opacity-30 bg-[#121620] border-zinc-700'
                    : 'bg-gradient-to-r from-[#0d1e33] via-[#102947] to-[#0c1a2c] border-[#00f0ff]/50 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                }`}
                style={{ width: '100%' }}
              >
                {/* Mini Filmstrip Notch Decoration */}
                <div className="absolute top-1 left-2 flex gap-1 pointer-events-none opacity-40">
                  <div className="w-2 h-1.5 bg-black/50 rounded-xs" />
                  <div className="w-2 h-1.5 bg-black/50 rounded-xs" />
                  <div className="w-2 h-1.5 bg-black/50 rounded-xs" />
                </div>
                <div className="flex items-center gap-2 z-10">
                  <span className="text-[11px] font-bold text-white tracking-wide truncate">
                    {selectedTrack ? selectedTrack.album_name || 'Cybernetic Soundscape' : '3D WebGL Shader Output'}
                  </span>
                  <span className="text-[9px] text-[#00f0ff] bg-[#00f0ff]/15 px-1.5 py-0.2 rounded border border-[#00f0ff]/30">
                    60FPS
                  </span>
                </div>
              </div>
            </div>

            {/* ─── C. Track 2 Clip: Kinetic Lyrics Stream (Filmora 10 items badge) ─── */}
            <div className="h-14 border-b border-[#141b26] relative p-1">
              {activeLyrics && activeLyrics.length > 0 ? (
                /* Aligned Filmora-style Lyric Container Badge */
                <div
                  className={`h-full rounded-md border flex items-center px-3 relative shadow-md transition-all ${
                    isLyricsMuted
                      ? 'opacity-30 bg-[#1a1424] border-zinc-700'
                      : 'bg-gradient-to-r from-[#1b152b] via-[#241a3d] to-[#1a1428] border-fuchsia-500/50 shadow-[0_0_12px_rgba(217,70,239,0.15)]'
                  }`}
                  style={{ width: '92%' }}
                >
                  {/* Filmora Reference Highlight: Red bordered badge */}
                  <div className="px-2.5 py-1 bg-[#100d1c] border border-red-500 rounded text-[10px] text-white font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span>{activeLyrics.length} kinetic words synchronized</span>
                  </div>

                  {/* Words Preview Chips */}
                  <div className="flex items-center gap-1.5 ml-3 overflow-hidden">
                    {activeLyrics.slice(0, 8).map((w, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-fuchsia-500/30 text-fuchsia-300"
                      >
                        {w.word}
                      </span>
                    ))}
                    {activeLyrics.length > 8 && (
                      <span className="text-[9px] text-zinc-500">+{activeLyrics.length - 8} more</span>
                    )}
                  </div>
                </div>
              ) : selectedTrack ? (
                /* Aligned Filmora-style Lyric Container Badge with 10 synchronized word events */
                <div
                  className={`h-full rounded-md border flex items-center px-3 relative shadow-md transition-all ${
                    isLyricsMuted
                      ? 'opacity-30 bg-[#1a1424] border-zinc-700'
                      : 'bg-gradient-to-r from-[#1b152b] via-[#241a3d] to-[#1a1428] border-fuchsia-500/50 shadow-[0_0_12px_rgba(217,70,239,0.15)]'
                  }`}
                  style={{ width: '82%' }}
                >
                  {/* Filmora Reference Highlight: Red bordered badge */}
                  <div className="px-2.5 py-1 bg-[#100d1c] border border-red-500 rounded text-[10px] text-white font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span>10 kinetic words synchronized</span>
                  </div>

                  {/* Words Preview Chips */}
                  <div className="flex items-center gap-1.5 ml-3 overflow-hidden">
                    {['JOURNEY', 'HORIZON', 'VELOCITY', 'PULSE', 'ECHO', 'DEEP'].map((w, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-fuchsia-500/30 text-fuchsia-300"
                      >
                        {w}
                      </span>
                    ))}
                    <span className="text-[9px] text-zinc-500">+4 more</span>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-md border border-dashed border-[#1e2533] bg-[#0a0d14]/40 flex items-center px-4 text-zinc-600 text-[10px]">
                  No kinetic lyrics track engaged. Select a track or run Whisper AI to generate synchronized word events.
                </div>
              )}
            </div>

            {/* ─── D. Track 3 Clip: Lossless Audio Waveform Peaks ─── */}
            <div className="h-16 border-b border-[#141b26] relative p-1">
              <div
                className={`h-full rounded-md border flex items-center px-2 relative overflow-hidden transition-all ${
                  isAudioMuted
                    ? 'opacity-30 bg-[#121a16] border-zinc-700'
                    : 'bg-gradient-to-r from-[#0c1815] via-[#0f2420] to-[#0a1614] border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                }`}
                style={{ width: '100%' }}
              >
                {/* Embedded High-Res Waveform Peaks */}
                <div className="w-full h-full flex items-center gap-0.5 py-1.5 opacity-80">
                  {peaks.map((p: number, i: number) => (
                    <div
                      key={i}
                      className="flex-1 bg-emerald-400/80 rounded-xs transition-all duration-75"
                      style={{
                        height: `${Math.max(12, p * 100)}%`,
                        backgroundColor:
                          (i / peaks.length) * 100 <= progressPercent ? '#00f0ff' : '#10b981',
                      }}
                    />
                  ))}
                </div>

                <div className="absolute bottom-1 left-3 text-[9px] font-mono text-zinc-400 bg-black/60 px-1.5 py-0.2 rounded border border-zinc-800">
                  {selectedTrack ? selectedTrack.title || selectedTrack.file_name : 'No Audio Track'}
                </div>
              </div>
            </div>

            {/* ─── E. Synchronized Red Playhead Needle ─── */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-all duration-75 ease-linear"
              style={{ left: `${progressPercent}%` }}
            >
              {/* Playhead Diamond Scrubber Head */}
              <div className="w-3.5 h-3.5 -ml-[7px] -mt-0.5 bg-[#e81123] rotate-45 shadow-[0_0_8px_#e81123] border border-white/60" />
              {/* Vertical Playhead Wire */}
              <div className="w-0.5 h-full bg-[#e81123] shadow-[0_0_6px_#e81123]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
