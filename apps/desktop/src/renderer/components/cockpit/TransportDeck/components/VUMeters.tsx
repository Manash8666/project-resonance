// apps/desktop/src/renderer/components/cockpit/TransportDeck/components/VUMeters.tsx
import React from 'react';

export interface VUMetersProps {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const VUMeters: React.FC<VUMetersProps> = ({
  bass,
  mid,
  treble,
  volume,
  onVolumeChange,
}) => {
  return (
    <div className="flex items-center space-x-3 w-72 justify-end">
      {/* Hardware Volume Fader */}
      <div className="flex items-center space-x-2 mr-3">
        <span className="text-[10px] text-zinc-500">VOL</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-20 h-1 bg-[#1c222c] rounded appearance-none cursor-pointer accent-[#00f0ff]"
        />
      </div>

      {/* 3-Band Mechanical LED VU Meters */}
      <div
        className="flex items-end space-x-1.5 h-7 px-2 py-1 bg-[#05070a] rounded border border-[#161c26]"
        title="Live Hardware Telemetry: Sub-Bass | Mid | Treble"
      >
        {/* Bass Meter */}
        <div className="w-1.5 bg-[#121620] h-full rounded-xs flex flex-col justify-end overflow-hidden">
          <div
            className="w-full bg-[#00f0ff] transition-all duration-75"
            style={{ height: `${Math.min(100, bass * 100)}%` }}
          />
        </div>
        {/* Mid Meter */}
        <div className="w-1.5 bg-[#121620] h-full rounded-xs flex flex-col justify-end overflow-hidden">
          <div
            className="w-full bg-amber-400 transition-all duration-75"
            style={{ height: `${Math.min(100, mid * 100)}%` }}
          />
        </div>
        {/* Treble Meter */}
        <div className="w-1.5 bg-[#121620] h-full rounded-xs flex flex-col justify-end overflow-hidden">
          <div
            className="w-full bg-fuchsia-400 transition-all duration-75"
            style={{ height: `${Math.min(100, treble * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
