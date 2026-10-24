// apps/desktop/src/renderer/components/cockpit/ForgeViewport/index.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  SkipBack,
  Rewind,
  Play,
  Pause,
  FastForward,
  SkipForward,
  Repeat,
  Camera,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { VisualizerScene } from 'visual-engine';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { audioEngine } from '../../../audio/AudioEngine.js';
import { TelemetryHUD } from './components/TelemetryHUD.js';
import { KineticOverlay } from './components/KineticOverlay.js';
import { ImmersiveHUD } from './components/ImmersiveHUD.js';

export interface ForgeViewportProps {
  audioElement?: HTMLAudioElement | null;
  coverArtUrl?: string | null;
}

export const ForgeViewport: React.FC<ForgeViewportProps> = ({
  audioElement = null,
  coverArtUrl = null,
}) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const [internalCoverArt, setInternalCoverArt] = useState<string | null>(null);

  // Fresh Mount Guard for WebGL Context
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Monitor Display Settings
  const [aspectMode, setAspectMode] = useState<'fill' | '9:16' | '16:9'>('fill');
  const [renderQuality, setRenderQuality] = useState<'Full' | '1/2' | '1/4'>('Full');

  // Immersive Mode State
  const isImmersive = useResonanceStore((s) => s.isImmersive);
  const setIsImmersive = useResonanceStore((s) => s.setIsImmersive);
  const toggleImmersive = useResonanceStore((s) => s.toggleImmersive);
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);
  const volume = useResonanceStore((s) => s.volume);
  const setVolume = useResonanceStore((s) => s.setVolume);

  // Inactivity & Cursor Hiding in Immersive Mode
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isCursorHidden, setIsCursorHidden] = useState(false);

  useEffect(() => {
    if (coverArtUrl) {
      setInternalCoverArt(coverArtUrl);
      return;
    }
    if (!selectedTrack?.id) {
      setInternalCoverArt(null);
      return;
    }
    window.resonance?.getCoverArt?.(selectedTrack.id)
      .then((art) => setInternalCoverArt(art))
      .catch(() => setInternalCoverArt(null));
  }, [coverArtUrl, selectedTrack?.id]);

  // Handle Mouse Inactivity in Immersive Mode
  useEffect(() => {
    if (!isImmersive) {
      setIsHudVisible(true);
      setIsCursorHidden(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      setIsHudVisible(true);
      setIsCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsHudVisible(false);
        setIsCursorHidden(true);
      }, 3500);
    };

    handleActivity();

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isImmersive]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Escape' && isImmersive) {
        e.preventDefault();
        setIsImmersive(false);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleImmersive();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive, setIsImmersive, toggleImmersive]);

  const effectiveAudioElement = audioElement ?? audioEngine.getAudioElement();
  const bands = useResonanceStore((s) => s.bands);
  const bandsRef = React.useRef(bands);
  bandsRef.current = bands;

  const activeLyrics = useResonanceStore((s) => s.activeLyrics);

  const activeWord = useMemo(() => {
    if (!activeLyrics || activeLyrics.length === 0) return null;
    return activeLyrics.find((w) => currentTime >= w.start && currentTime <= w.end) || null;
  }, [activeLyrics, currentTime]);

  const handleTogglePlay = async () => {
    let track = selectedTrack;
    if (!track) {
      const all = useResonanceStore.getState().tracks;
      if (all.length > 0) {
        track = all[0];
        useResonanceStore.getState().setSelectedTrackId(track.id);
        useResonanceStore.getState().setSelectedTrack(track);
      }
    }
    if (track) {
      const el = audioEngine.getAudioElement();
      if (!el.src || el.src === window.location.href || !el.src.includes(track.file_path.substring(0, 20))) {
        await audioEngine.loadTrack(track.file_path);
      }
    }
    await audioEngine.toggle();
  };

  const formatSMPTE = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  if (!mounted) {
    return <div className="w-full h-full bg-[#050505] flex items-center justify-center" />;
  }

  return (
    <div
      className={`w-full h-full bg-[#050505] flex flex-col select-none ${
        isImmersive ? 'fixed inset-0 z-40' : 'relative overflow-hidden'
      } ${isImmersive && isCursorHidden ? 'cursor-none' : 'cursor-default'}`}
    >
      {/* ─── 1. Monitor Header ─── */}
      {!isImmersive && (
        <div className="h-8 bg-[#0a0a0a] border-b border-[#27272a] px-3 flex items-center justify-between shrink-0 text-zinc-400 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00ffff] shadow-[0_0_6px_#00ffff]" />
              <span>The Forge</span>
            </span>

            {/* Quality Dropdown */}
            <div className="flex items-center gap-1 text-[10px] bg-[#111111] border border-[#27272a] rounded px-1.5 py-0.5">
              <span className="text-zinc-500 uppercase">Quality:</span>
              <button
                onClick={() =>
                  setRenderQuality(renderQuality === 'Full' ? '1/2' : renderQuality === '1/2' ? '1/4' : 'Full')
                }
                className="text-[#00ffff] font-bold cursor-pointer"
              >
                {renderQuality} ⌵
              </button>
            </div>

            {/* Aspect Ratio Switcher */}
            <div className="flex items-center gap-1 bg-[#111111] border border-[#27272a] rounded px-1 py-0.5 text-[10px]">
              {(['fill', '16:9', '9:16'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAspectMode(mode)}
                  className={`px-1.5 py-0.2 rounded uppercase transition-colors cursor-pointer ${
                    aspectMode === mode
                      ? 'bg-[#18181b] text-[#00ffff] font-bold border border-[#00ffff]/50'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode === '9:16' ? 'Vertical 9:16' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImmersive(true)}
              className="p-1 text-zinc-400 hover:text-[#00ffff] transition-colors cursor-pointer"
              title="Fullscreen Visualizer (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. Center 3D WebGL Canvas Scene ─── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-[#050505]">
        {/* Ambient Reflection in Vertical 9:16 Mode */}
        {aspectMode === '9:16' && !isImmersive && (
          <div className="absolute inset-0 opacity-20 filter blur-xl pointer-events-none scale-125">
            <div className="w-full h-full bg-gradient-to-t from-[#00ffff]/30 via-fuchsia-900/20 to-black" />
          </div>
        )}

        {/* Viewport Frame Container */}
        <div
          className={`relative transition-all duration-300 flex items-center justify-center ${
            isImmersive
              ? 'w-full h-full'
              : aspectMode === '9:16'
              ? 'aspect-[9/16] h-[95%] max-w-sm rounded-lg border-2 border-[#27272a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden bg-black'
              : aspectMode === '16:9'
              ? 'aspect-video w-[95%] max-h-full rounded-lg border border-[#27272a] shadow-2xl overflow-hidden'
              : 'w-full h-full'
          }`}
        >
          {aspectMode === '9:16' ? (
            /* Vertical 9:16 Phone Monitor Scene (Sunny coastal mountain + bold golden JOURNEY) */
            <div className="absolute inset-0 overflow-hidden flex flex-col justify-between">
              {/* Sky and distant mountains */}
              <div className="h-[45%] w-full bg-gradient-to-b from-[#38bdf8] via-[#67e8f9] to-[#bae6fd] relative overflow-hidden">
                <div className="absolute top-4 right-8 w-16 h-16 rounded-full bg-amber-200/60 blur-md pointer-events-none" />
                <svg className="absolute bottom-0 w-full h-24 text-[#0f2e2b] opacity-90" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <polygon points="0,50 15,28 35,42 60,18 85,38 100,22 100,50" fill="currentColor" />
                  <polygon points="20,50 45,32 75,48 100,30 100,50" fill="#091f1d" opacity="0.7" />
                </svg>
              </div>

              {/* Turquoise Coastal Ocean Waves with Sandy Beach */}
              <div className="h-[55%] w-full bg-gradient-to-b from-[#0284c7] via-[#0ea5e9] to-[#fde047]/40 relative overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                  <div className="w-[120%] h-6 rounded-full bg-white blur-xs -translate-x-4 translate-y-3" />
                  <div className="w-[130%] h-8 rounded-full bg-white/70 blur-xs -translate-x-6 translate-y-12" />
                  <div className="w-[110%] h-10 rounded-full bg-amber-100/60 blur-xs translate-y-24" />
                </div>
              </div>

              {/* Center Golden Typography: "JOURNEY" */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 px-4">
                <span
                  className="text-2xl sm:text-3xl font-black tracking-wider text-[#facc15] drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] font-sans transform scale-y-110"
                  style={{
                    textShadow: '0 0 20px rgba(250,204,21,0.5), 0 4px 10px rgba(0,0,0,0.9)',
                  }}
                >
                  JOURNEY
                </span>
              </div>

              {/* Audio Reactive Glow Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-75"
                style={{
                  boxShadow: isPlaying ? `inset 0 0 ${Math.round(bands.bass * 40)}px rgba(0,255,255,0.4)` : 'none',
                }}
              />
            </div>
          ) : (
            /* 16:9 / Fill 3D WebGL Canvas with Drei Infinite Cyan Grid */
            <div className="absolute inset-0">
              <VisualizerScene
                audioElement={effectiveAudioElement}
                dataTexture={audioEngine.getDataTexture() as any}
                bandsRef={bandsRef}
                albumArtUrl={internalCoverArt}
              />
            </div>
          )}

          {/* Kinetic Typography Overlay */}
          <KineticOverlay activeWord={activeWord} />
        </div>

        {/* Glassmorphism Telemetry HUD Overlay (Top-Left) */}
        {!isImmersive && (
          <TelemetryHUD bass={bands.bass} mid={bands.mid} treble={bands.treble} />
        )}

        {/* Return to DAW Button (Visible in Immersive Mode) */}
        {isImmersive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsImmersive(false);
            }}
            className={`absolute top-4 right-4 z-50 px-3 py-1.5 bg-[#0a0a0a]/90 hover:bg-[#00ffff]/20 border border-[#00ffff]/40 hover:border-[#00ffff] rounded-md text-[11px] font-mono text-zinc-200 hover:text-[#00ffff] transition-all duration-300 cursor-pointer backdrop-blur-md shadow-[0_0_15px_rgba(0,255,255,0.2)] flex items-center space-x-2 ${
              isHudVisible ? 'opacity-90' : 'opacity-35 hover:opacity-100'
            }`}
            title="Return to DAW Cockpit (Press 'ESC' or 'F')"
          >
            <span className="text-xs">⎋</span>
            <span className="text-[10px] tracking-wider font-semibold">RETURN TO DAW</span>
            <kbd className="px-1.5 py-0.5 text-[9px] bg-black/60 border border-zinc-700 rounded text-[#00ffff]">
              ESC
            </kbd>
          </button>
        )}
      </div>

      {/* ─── 3. Monitor Transport Bar ─── */}
      {!isImmersive && (
        <div className="h-9 bg-[#0a0a0a] border-t border-[#27272a] px-3 flex items-center justify-between shrink-0 text-zinc-300 font-mono text-xs">
          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="text-[#00ffff]">{formatSMPTE(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">{formatSMPTE(duration)}</span>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center gap-1.5">
            {/* Step Frame Back */}
            <button
              onClick={() => audioEngine.seek(Math.max(0, currentTime - 1 / 30))}
              className="p-1.5 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer text-zinc-400"
              title="Step 1 Frame Back"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Skip 5s Back */}
            <button
              onClick={() => audioEngine.seek(Math.max(0, currentTime - 5))}
              className="p-1.5 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer text-zinc-400"
              title="Skip 5s Back (J)"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            {/* Main Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="w-7 h-7 rounded-full bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00ffff] flex items-center justify-center text-[#00ffff] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,255,255,0.25)] active:scale-95"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip 5s Forward */}
            <button
              onClick={() => audioEngine.seek(Math.min(duration, currentTime + 5))}
              className="p-1.5 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer text-zinc-400"
              title="Skip 5s Forward (L)"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Step Frame Forward */}
            <button
              onClick={() => audioEngine.seek(Math.min(duration, currentTime + 1 / 30))}
              className="p-1.5 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer text-zinc-400"
              title="Step 1 Frame Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Region Loop Marker */}
            <button
              className="p-1.5 text-zinc-400 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer ml-1"
              title="Loop Playback Region"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Tools: Snapshot, Volume, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Snapshot Camera */}
            <button
              onClick={() => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const url = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `resonance_snapshot_${Date.now()}.png`;
                  a.click();
                }
              }}
              className="p-1.5 text-zinc-400 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
              title="Capture Viewport Snapshot"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  audioEngine.setVolume(v);
                }}
                className="w-16 h-1 bg-[#18181b] rounded-lg appearance-none cursor-pointer accent-[#00ffff]"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>

            {/* Maximize to Immersive */}
            <button
              onClick={() => setIsImmersive(true)}
              className="p-1.5 text-zinc-400 hover:text-[#00ffff] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
              title="Enter Immersive 3D Visualizer (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD in Immersive Mode */}
      <ImmersiveHUD
        isVisible={isImmersive && isHudVisible}
        onExit={() => setIsImmersive(false)}
      />
    </div>
  );
};
