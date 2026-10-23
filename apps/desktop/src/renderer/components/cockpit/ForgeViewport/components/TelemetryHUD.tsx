// apps/desktop/src/renderer/components/cockpit/ForgeViewport/components/TelemetryHUD.tsx
import React from 'react';

export interface TelemetryHUDProps {
  bass: number;
  mid: number;
  treble: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ bass, mid, treble }) => {
  return (
    <div className="absolute top-4 left-4 z-10 font-mono text-[10px] space-y-1 bg-black/60 p-2.5 rounded border border-[#1c222c] backdrop-blur-xs pointer-events-none">
      <div className="flex justify-between space-x-4 text-zinc-400">
        <span>PIPELINE</span>
        <span className="text-[#00f0ff] font-bold">ZERO-ZERO GPU</span>
      </div>
      <div className="flex justify-between space-x-4 text-zinc-400">
        <span>SUB-BASS RMS</span>
        <span className="text-cyan-400">{(bass * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between space-x-4 text-zinc-400">
        <span>MID HARMONICS</span>
        <span className="text-yellow-400">{(mid * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between space-x-4 text-zinc-400">
        <span>TREBLE JITTER</span>
        <span className="text-magenta-400">{(treble * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};
