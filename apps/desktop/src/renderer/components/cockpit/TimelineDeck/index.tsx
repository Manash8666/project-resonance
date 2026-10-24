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

export interface TimelineDeckProps {
  onTogglePlay?: () => void;
  onSeek?: (timeInSeconds: number) => void;
}

export const TimelineDeck: React.FC<TimelineDeckProps> = ({ onTogglePlay, onSeek }) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);
  const setActiveLyrics = useResonanceStore((s) => s.setActiveLyrics);
  const setTracks = useResonanceStore((s) => s.setTracks);
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);
  const seekTo = useResonanceStore((s) => s.seekTo);
  const timelineTool = useResonanceStore((s) => s.timelineTool);
  const setTimelineTool = useResonanceStore((s) => s.setTimelineTool);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isLyricsMuted, setIsLyricsMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<string | null>(null);

  const handleWhisperSync = async () => {
    if (!selectedTrack || isTranscribing) return;
    setIsTranscribing(true);
    setWhisperStatus('Syncing...');
    try {
      const words = await window.resonance?.transcribeTrack?.(selectedTrack.file_path);
      if (Array.isArray(words)) {
        await window.resonance?.saveLyrics?.(selectedTrack.id, words, words.length === 0);
        setActiveLyrics(words);
        setSelectedTrack({ ...selectedTrack, has_lyrics: words.length > 0 ? 1 : 0 });
        setTracks(
          useResonanceStore.getState().tracks.map((t) =>
            t.id === selectedTrack.id ? { ...t, has_lyrics: words.length > 0 ? 1 : 0 } : t
          )
        );
        setWhisperStatus(`✓ ${words.length}w`);
        setTimeout(() => setWhisperStatus(null), 3000);
      }
    } catch {
      setWhisperStatus('Failed');
      setTimeout(() => setWhisperStatus(null), 3000);
    } finally {
      setIsTranscribing(false);
    }
  };

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = duration > 0 ? duration : 60;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  const formatTimecode = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Generate ruler tick marks
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

  // Handle timeline seek
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

  // High-density waveform peaks
  const peaks: number[] = useMemo(() => {
    if (selectedTrack?.waveform_peaks) {
      try {
        const parsed = Array.isArray(selectedTrack.waveform_peaks)
          ? selectedTrack.waveform_peaks
          : JSON.parse(selectedTrack.waveform_peaks);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map((x: unknown) => Number(x) || 0);
      } catch {
        // Fallback to synthetic
      }
    }
    const synth: number[] = [];
    const seed = (selectedTrack?.id || 1) * 19;
    for (let i = 0; i < 140; i++) {
      const v = 0.15 + 0.75 * Math.abs(Math.sin((i + seed) * 0.17) * Math.cos(i * 0.29));
      synth.push(parseFloat(v.toFixed(3)));
    }
    return synth;
  }, [selectedTrack?.id, selectedTrack?.waveform_peaks]);

  return (
    <div className="flex flex-col h-full bg-[#050505] border-t border-[#27272a] font-mono select-none overflow-hidden text-xs">
      {/* ─── 1. Precision NLE Timeline Toolbar ─── */}
      <div className="h-9 bg-[#09090c] border-b border-[#27272a] px-3 flex items-center justify-between shrink-0 text-zinc-400">
        {/* Left Editing Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-1.5 rounded-xs hover:bg-[#18181b] hover:text-[#00ffff] transition-colors cursor-pointer"
            title="Grid Modes"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTimelineTool('select')}
            className={`p-1.5 rounded-xs transition-all cursor-pointer border ${
              timelineTool === 'select'
                ? 'bg-[#18181b] text-[#00ffff] border-[#00ffff]/50 shadow-[0_0_8px_rgba(0,255,255,0.25)]'
                : 'border-transparent hover:bg-[#18181b] hover:text-white'
            }`}
            title="Selection Tool (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTimelineTool('split')}
            className={`p-1.5 rounded-xs transition-all cursor-pointer border ${
              timelineTool === 'split'
                ? 'bg-[#18181b] text-[#00ffff] border-[#00ffff]/50 shadow-[0_0_8px_rgba(0,255,255,0.25)]'
                : 'border-transparent hover:bg-[#18181b] hover:text-white'
            }`}
            title="Split Razor (C)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-xs hover:bg-[#18181b] hover:text-red-400 transition-colors cursor-pointer"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#27272a] mx-1" />

          {/* Title Layer */}
          <button
            type="button"
            onClick={() => setTimelineTool('text')}
            className={`px-2 py-1 rounded-xs border text-[10px] font-sans font-semibold tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
              timelineTool === 'text'
                ? 'bg-[#18181b] border-[#00ffff]/50 text-[#00ffff]'
                : 'bg-[#111114] border-[#27272a] text-zinc-300 hover:text-white hover:border-[#00ffff]/40'
            }`}
            title="Add Kinetic Typography Layer"
          >
            <Type className="w-3 h-3 text-[#00ffff]" />
            <span>TITLE</span>
          </button>

          {/* AI Whisper STT Sync */}
          <button
            type="button"
            onClick={handleWhisperSync}
            disabled={isTranscribing || !selectedTrack}
            className={`px-2 py-1 border rounded-xs text-[10px] font-sans font-semibold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedTrack?.has_lyrics
                ? 'bg-[#10241b] hover:bg-[#163326] border-emerald-500/50 text-emerald-300'
                : 'bg-[#1c1328] hover:bg-[#2a1d3d] border-fuchsia-500/50 text-fuchsia-300'
            }`}
            title="Whisper AI Speech-To-Text Sync"
          >
            <Sparkles className="w-3 h-3 text-current" />
            <span>{whisperStatus || (selectedTrack?.has_lyrics ? 'WHISPER ✓' : 'WHISPER')}</span>
          </button>

          <button
            type="button"
            className="p-1.5 rounded-xs hover:bg-[#18181b] hover:text-[#00ffff] transition-colors cursor-pointer"
            title="Add Marker (M)"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center SMPTE Timecode & Quick Play Toggle */}
        <div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-1.5 rounded-xs bg-[#111114] hover:bg-[#18181b] text-[#00ffff] border border-[#27272a] hover:border-[#00ffff]/50 transition-all cursor-pointer flex items-center justify-center shadow-xs"
              title={isPlaying ? 'Pause Audio (Space)' : 'Play Audio (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current ml-0.5" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2 bg-[#050505] px-3 py-1 rounded-xs border border-[#27272a] shadow-inner">
            <span className="text-[#00ffff] font-mono font-bold tracking-wider text-xs">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-zinc-600 font-mono">/</span>
            <span className="text-zinc-500 font-mono text-xs">
              {formatTimecode(effectiveDuration)}
            </span>
          </div>
        </div>

        {/* Right Snapping & Zoom Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
              snappingEnabled ? 'text-[#00ffff] bg-[#00ffff]/10' : 'text-zinc-600 hover:text-zinc-400'
            }`}
            title={snappingEnabled ? 'Magnet Snapping ON' : 'Magnet Snapping OFF'}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Calibrated Zoom Slider */}
          <div className="flex items-center gap-1.5 bg-[#09090c] border border-[#27272a] rounded-xs px-2 py-1">
            <ZoomOut className="w-3 h-3 text-zinc-500" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#18181b] rounded-sm appearance-none cursor-pointer accent-[#00ffff]"
              title="Timeline Zoom Level"
            />
            <ZoomIn className="w-3 h-3 text-zinc-500" />
            <span className="text-[9px] font-mono text-zinc-500 ml-0.5 w-6 text-right">
              {zoomLevel.toFixed(1)}x
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. Multi-Track Timeline Workspace ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Track Headers (Fixed Width: 140px) */}
        <div className="w-[140px] bg-[#09090c] border-r border-[#27272a] flex flex-col shrink-0 text-[11px] font-mono z-20">
          {/* Header Spacer (matches Ruler height) */}
          <div className="h-6 bg-[#0e0e11] border-b border-[#27272a] flex items-center justify-between px-2 text-[9px] text-zinc-500 font-bold tracking-widest uppercase">
            <span>TRACKS</span>
            <div className="rack-screw" />
          </div>

          {/* Track 1: Video 1 (Shader Engine) */}
          <div className="h-16 border-b border-[#1c1c20] px-2.5 flex items-center justify-between bg-[#0a0a0c]">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] font-mono text-[9px] font-bold">
                V1
              </span>
              <span className="font-sans font-bold text-zinc-300 text-[11px]">Video 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  isVideoMuted ? 'text-zinc-600' : 'text-[#00ffff]'
                }`}
                title="Toggle Visibility"
              >
                {isVideoMuted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <Lock className="w-3 h-3 text-zinc-600" />
            </div>
          </div>

          {/* Track 2: Kinetic 1 (Lyrics) */}
          <div className="h-14 border-b border-[#1c1c20] px-2.5 flex items-center justify-between bg-[#0a0a0c]">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold">
                K1
              </span>
              <span className="font-sans font-bold text-zinc-300 text-[11px]">Kinetic 1</span>
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

          {/* Track 3: Audio 1 (Lossless Waveform) */}
          <div className="h-16 border-b border-[#1c1c20] px-2.5 flex items-center justify-between bg-[#0a0a0c]">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.2 rounded-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold">
                A1
              </span>
              <span className="font-sans font-bold text-zinc-300 text-[11px]">Audio 1</span>
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

        {/* Right Timeline Canvas (Ruler + Track Lanes + Playhead) */}
        <div
          ref={timelineContainerRef}
          onClick={handleTimelineInteraction}
          className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative bg-[#050505] cursor-pointer"
        >
          {/* Inner Scaled Canvas based on zoomLevel */}
          <div
            className="h-full relative"
            style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}
          >
            {/* ─── A. Timeline Time Ruler ─── */}
            <div className="h-6 bg-[#09090c] border-b border-[#27272a] relative flex items-center overflow-hidden">
              {rulerTicks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                  style={{ left: `${tick.percent}%` }}
                >
                  <span className="text-[9px] text-zinc-500 font-mono tracking-tighter pl-1">
                    {tick.label}
                  </span>
                  <div className="w-px h-2 bg-[#27272a]" />
                </div>
              ))}
            </div>

            {/* ─── B. Track 1: 3D WebGL Shader Video Clip ─── */}
            <div className="h-16 border-b border-[#18181b] relative p-1">
              <div
                className={`h-full rounded-xs border flex items-center px-3 relative overflow-hidden shadow-sm transition-all ${
                  isVideoMuted
                    ? 'opacity-30 bg-[#111114] border-zinc-700'
                    : 'bg-gradient-to-r from-[#071321] via-[#0d2138] to-[#081524] border-[#00ffff]/40 shadow-[0_0_12px_rgba(0,255,255,0.12)]'
                }`}
                style={{ width: '100%' }}
              >
                {/* Filmstrip sprocket notch decoration */}
                <div className="absolute top-1 left-2 flex gap-1.5 pointer-events-none opacity-40">
                  <div className="w-2.5 h-1.5 bg-black/60 rounded-xs border border-white/10" />
                  <div className="w-2.5 h-1.5 bg-black/60 rounded-xs border border-white/10" />
                  <div className="w-2.5 h-1.5 bg-black/60 rounded-xs border border-white/10" />
                </div>
                <div className="flex items-center gap-2 z-10">
                  <Video className="w-3 h-3 text-[#00ffff]" />
                  <span className="text-[11px] font-sans font-bold text-white tracking-wide truncate">
                    {selectedTrack ? selectedTrack.album_name || 'Cybernetic Soundscape' : '3D WebGL Shader Output'}
                  </span>
                  <span className="text-[9px] font-mono text-[#00ffff] bg-[#00ffff]/15 px-1.5 py-0.2 rounded-xs border border-[#00ffff]/30">
                    60FPS
                  </span>
                </div>
              </div>
            </div>

            {/* ─── C. Track 2: Kinetic Lyrics Stream ─── */}
            <div className="h-14 border-b border-[#18181b] relative p-1">
              {activeLyrics && activeLyrics.length > 0 ? (
                <div
                  className={`h-full rounded-xs border flex items-center px-3 relative shadow-md transition-all ${
                    isLyricsMuted
                      ? 'opacity-30 bg-[#161021] border-zinc-700'
                      : 'bg-gradient-to-r from-[#170e24] via-[#24153b] to-[#180e26] border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.15)]'
                  }`}
                  style={{ width: '94%' }}
                >
                  <div className="px-2.5 py-1 bg-[#0d0717] border border-amber-500/60 rounded-xs text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{activeLyrics.length} kinetic word events</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-3 overflow-hidden">
                    {activeLyrics.slice(0, 8).map((w, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs bg-black/50 border border-fuchsia-500/30 text-fuchsia-300"
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
                <div
                  className={`h-full rounded-xs border flex items-center px-3 relative shadow-md transition-all ${
                    isLyricsMuted
                      ? 'opacity-30 bg-[#161021] border-zinc-700'
                      : 'bg-gradient-to-r from-[#170e24] via-[#24153b] to-[#180e26] border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.15)]'
                  }`}
                  style={{ width: '88%' }}
                >
                  <div className="px-2.5 py-1 bg-[#0d0717] border border-amber-500/60 rounded-xs text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>10 kinetic words synchronized</span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-3 overflow-hidden">
                    {['JOURNEY', 'HORIZON', 'VELOCITY', 'PULSE', 'ECHO', 'DEEP'].map((w, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-xs bg-black/50 border border-fuchsia-500/30 text-fuchsia-300"
                      >
                        {w}
                      </span>
                    ))}
                    <span className="text-[9px] text-zinc-500">+4 more</span>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-xs border border-dashed border-[#27272a] bg-[#09090c]/40 flex items-center px-4 text-zinc-600 text-[10px] font-mono">
                  No kinetic lyrics track engaged. Run Whisper AI to generate synchronized events.
                </div>
              )}
            </div>

            {/* ─── D. Track 3: Lossless Audio Waveform Peaks ─── */}
            <div className="h-16 border-b border-[#18181b] relative p-1">
              <div
                className={`h-full rounded-xs border flex items-center px-2 relative overflow-hidden transition-all ${
                  isAudioMuted
                    ? 'opacity-30 bg-[#101915] border-zinc-700'
                    : 'bg-gradient-to-r from-[#06120e] via-[#091a14] to-[#06120e] border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                }`}
                style={{ width: '100%' }}
              >
                {/* Embedded High-Res Waveform Peaks with Cyan / Emerald Split Coloring */}
                <div className="w-full h-full flex items-center gap-0.5 py-1.5 opacity-90">
                  {peaks.map((p: number, i: number) => {
                    const isPlayed = (i / peaks.length) * 100 <= progressPercent;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-xs transition-colors duration-75"
                        style={{
                          height: `${Math.max(12, p * 100)}%`,
                          backgroundColor: isPlayed ? '#00ffff' : '#10b981',
                          boxShadow: isPlayed ? '0 0 4px rgba(0, 255, 255, 0.4)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="absolute bottom-1 left-3 text-[9px] font-mono text-zinc-300 bg-black/75 px-1.5 py-0.2 rounded-xs border border-zinc-800 flex items-center gap-1.5">
                  <Music className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{selectedTrack ? selectedTrack.title || selectedTrack.file_name : 'No Audio Track'}</span>
                </div>
              </div>
            </div>

            {/* ─── E. Synchronized Cyan Playhead Scrubber Needle ─── */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-all duration-75 ease-linear"
              style={{ left: `${progressPercent}%` }}
            >
              {/* Playhead Inverted Triangle / Diamond Head */}
              <div className="w-3.5 h-3.5 -ml-[7px] -mt-0.5 bg-[#00ffff] rotate-45 shadow-[0_0_10px_#00ffff] border border-white" />
              {/* Vertical Playhead Wire */}
              <div className="w-0.5 h-full bg-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
