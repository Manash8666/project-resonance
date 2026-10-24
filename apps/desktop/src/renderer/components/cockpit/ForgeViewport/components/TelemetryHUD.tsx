// apps/desktop/src/renderer/components/cockpit/ForgeViewport/components/TelemetryHUD.tsx
import React from 'react';

export interface TelemetryHUDProps {
  bass: number;
  mid: number;
  treble: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ bass, mid, treble }) => {
  return (
    <div className="absolute top-3 left-3 z-10 font-mono text-[10px] space-y-1.5 bg-black/40 backdrop-blur-md p-3 rounded-lg border border-[#27272a] border-t-[#00ffff]/60 pointer-events-none shadow-[0_4px_20px_rgba(0,0,0,0.6)] select-none">
      <div className="flex items-center justify-between space-x-6 text-zinc-400 border-b border-[#27272a] pb-1">
        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">TELEMETRY</span>
        <span className="text-[#00ffff] font-bold text-[10px] flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ffff] shadow-[0_0_6px_#00ffff] animate-pulse" />
          <span>ZERO-ZERO GPU</span>
        </span>
      </div>

      {/* Sub-Bass Band */}
      <div className="flex items-center justify-between space-x-5 text-zinc-400">
        <span className="text-[9px] font-bold tracking-wider">SUB-BASS</span>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-1.5 bg-[#111111] rounded-xs overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-[#00ffff] transition-all duration-75 shadow-[0_0_8px_#00ffff]"
              style={{ width: `${Math.min(100, Math.round(bass * 100))}%` }}
            />
          </div>
          <span className="text-[#00ffff] font-mono font-bold w-10 text-right">
            {(bass * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Mid Harmonics Band */}
      <div className="flex items-center justify-between space-x-5 text-zinc-400">
        <span className="text-[9px] font-bold tracking-wider">MID</span>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-1.5 bg-[#111111] rounded-xs overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-[#f59e0b] transition-all duration-75 shadow-[0_0_8px_#f59e0b]"
              style={{ width: `${Math.min(100, Math.round(mid * 100))}%` }}
            />
          </div>
          <span className="text-[#f59e0b] font-mono font-bold w-10 text-right">
            {(mid * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Treble Jitter Band */}
      <div className="flex items-center justify-between space-x-5 text-zinc-400">
        <span className="text-[9px] font-bold tracking-wider">TREBLE</span>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-1.5 bg-[#111111] rounded-xs overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-[#ef4444] transition-all duration-75 shadow-[0_0_8px_#ef4444]"
              style={{ width: `${Math.min(100, Math.round(treble * 100))}%` }}
            />
          </div>
          <span className="text-[#ef4444] font-mono font-bold w-10 text-right">
            {(treble * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
