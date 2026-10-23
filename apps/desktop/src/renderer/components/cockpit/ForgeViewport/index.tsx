// apps/desktop/src/renderer/components/cockpit/ForgeViewport/index.tsx
import React, { useMemo } from 'react';
import { VisualizerScene } from 'visual-engine';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { TelemetryHUD } from './components/TelemetryHUD.js';
import { KineticOverlay } from './components/KineticOverlay.js';

export interface ForgeViewportProps {
  audioElement: HTMLAudioElement | null;
  coverArtUrl: string | null;
}

export const ForgeViewport: React.FC<ForgeViewportProps> = ({ audioElement, coverArtUrl }) => {
  const bands = useResonanceStore((s) => s.bands);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);

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
          albumArtUrl={coverArtUrl}
        />
      </div>

      {/* Cybernetic Telemetry HUD Overlay (Top-Left) */}
      <TelemetryHUD bass={bands.bass} mid={bands.mid} treble={bands.treble} />

      {/* Kinetic Typography Manifestation (Center) */}
      <KineticOverlay activeWord={activeWord} />
    </div>
  );
};
