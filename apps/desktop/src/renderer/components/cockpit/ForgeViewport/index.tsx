// apps/desktop/src/renderer/components/cockpit/ForgeViewport/index.tsx
import React, { useMemo, useState, useEffect } from 'react';
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

  // Immersive Mode State
  const isImmersive = useResonanceStore((s) => s.isImmersive);
  const setIsImmersive = useResonanceStore((s) => s.setIsImmersive);
  const toggleImmersive = useResonanceStore((s) => s.toggleImmersive);

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
      }, 3500); // 3.5 seconds of inactivity hides HUD and cursor
    };

    // Initial wake on entering immersive mode
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

  // Global Keyboard Shortcuts (Escape to exit, F to toggle)
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive, setIsImmersive, toggleImmersive]);

  const effectiveAudioElement = audioElement ?? audioEngine.getAudioElement();
  const bands = useResonanceStore((s) => s.bands);
  const bandsRef = React.useRef(bands);
  bandsRef.current = bands;

  const currentTime = useResonanceStore((s) => s.currentTime);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);

  // Active word calculation for real-time kinetic overlay
  const activeWord = useMemo(() => {
    if (!activeLyrics || activeLyrics.length === 0) return null;
    return activeLyrics.find((w) => currentTime >= w.start && currentTime <= w.end) || null;
  }, [activeLyrics, currentTime]);

  if (!mounted) {
    return <div className="w-full h-full bg-[#05070a] flex items-center justify-center" />;
  }

  return (
    <div
      onDoubleClick={toggleImmersive}
      className={`w-full h-full bg-[#05070a] flex items-center justify-center select-none ${
        isImmersive
          ? 'fixed inset-0 z-40'
          : 'relative overflow-hidden'
      } ${isImmersive && isCursorHidden ? 'cursor-none' : 'cursor-default'}`}
    >
      {/* 3D WebGL Canvas Scene (Persistent Canvas: Zero Remounts) */}
      <div className="absolute inset-0">
        <VisualizerScene
          audioElement={effectiveAudioElement}
          dataTexture={audioEngine.getDataTexture() as any}
          bandsRef={bandsRef}
          albumArtUrl={internalCoverArt}
        />
      </div>

      {/* Cybernetic Telemetry HUD Overlay (Top-Left, Hidden in Immersive Mode) */}
      {!isImmersive && (
        <TelemetryHUD bass={bands.bass} mid={bands.mid} treble={bands.treble} />
      )}

      {/* Quick Immersive Toggle Action (Top-Right) */}
      {!isImmersive ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsImmersive(true);
          }}
          className="absolute top-4 right-4 z-20 px-2.5 py-1.5 bg-[#080c14]/75 hover:bg-[#00f0ff]/20 border border-[#1e2533] hover:border-[#00f0ff]/60 rounded-md text-[11px] font-mono text-zinc-400 hover:text-[#00f0ff] transition-all cursor-pointer backdrop-blur-sm shadow-md flex items-center space-x-1.5 group"
          title="Enter Immersive Mode (Double-click or press 'F')"
        >
          <span className="text-xs group-hover:scale-110 transition-transform">⛶</span>
          <span className="text-[10px] tracking-wider font-semibold">IMMERSIVE</span>
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsImmersive(false);
          }}
          className={`absolute top-4 right-4 z-50 px-3 py-1.5 bg-[#080c14]/90 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/40 hover:border-[#00f0ff] rounded-md text-[11px] font-mono text-zinc-200 hover:text-[#00f0ff] transition-all duration-300 cursor-pointer backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center space-x-2 ${
            isHudVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          title="Return to DAW Cockpit (Press 'ESC' or 'F')"
        >
          <span className="text-xs">⎋</span>
          <span className="text-[10px] tracking-wider font-semibold">RETURN TO DAW</span>
          <kbd className="px-1.5 py-0.5 text-[9px] bg-black/60 border border-zinc-700 rounded text-[#00f0ff]">
            ESC
          </kbd>
        </button>
      )}

      {/* Kinetic Typography Manifestation (Center: Always Active in Sync) */}
      <KineticOverlay activeWord={activeWord} />

      {/* Minimal Floating Cybernetic HUD (Visible only in Immersive Mode during activity) */}
      <ImmersiveHUD
        isVisible={isImmersive && isHudVisible}
        onExit={() => setIsImmersive(false)}
      />
    </div>
  );
};

