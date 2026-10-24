// apps/desktop/src/renderer/components/cockpit/ForgeViewport/components/TelemetryHUD.tsx
import React from 'react';

export interface TelemetryHUDProps {
  bass: number;
  mid: number;
  treble: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ bass, mid, treble }) => {
  return (
    <div className="absolute top-4 left-4 z-10 font-mono text-[10px] space-y-1.5 bg-[#080c14]/80 p-3 rounded-md border border-[#1e2533] border-t-[#00f0ff]/50 backdrop-blur-md pointer-events-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between space-x-6 text-zinc-400 border-b border-[#1c222c] pb-1">
        <span className="text-[9px] text-zinc-500 tracking-wider">PIPELINE</span>
        <span className="text-[#00f0ff] font-bold text-[10px] flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
          <span>ZERO-ZERO GPU</span>
        </span>
      </div>
      <div className="flex items-center justify-between space-x-6 text-zinc-400">
        <span className="text-[9px]">SUB-BASS</span>
        <div className="flex items-center space-x-2">
          <div className="w-12 h-1 bg-[#121620] rounded-xs overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(bass * 100))}%` }}
            />
          </div>
          <span className="text-cyan-400 font-mono w-9 text-right">{(bass * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-center justify-between space-x-6 text-zinc-400">
        <span className="text-[9px]">MID HARMONICS</span>
        <div className="flex items-center space-x-2">
          <div className="w-12 h-1 bg-[#121620] rounded-xs overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(mid * 100))}%` }}
            />
          </div>
          <span className="text-yellow-400 font-mono w-9 text-right">{(mid * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-center justify-between space-x-6 text-zinc-400">
        <span className="text-[9px]">TREBLE JITTER</span>
        <div className="flex items-center space-x-2">
          <div className="w-12 h-1 bg-[#121620] rounded-xs overflow-hidden">
            <div
              className="h-full bg-magenta-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(treble * 100))}%` }}
            />
          </div>
          <span className="text-magenta-400 font-mono w-9 text-right">{(treble * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
