// apps/desktop/src/renderer/components/cockpit/TransportDeck/components/WaveformPreview.tsx
import React, { useMemo } from 'react';

export interface WaveformPreviewProps {
  peaks?: number[] | null;
  currentTime: number;
  duration: number;
}

export const WaveformPreview: React.FC<WaveformPreviewProps> = ({
  peaks,
  currentTime,
  duration,
}) => {
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const totalWidth = 100; // viewBox width units

  const pathData = useMemo(() => {
    if (!peaks || peaks.length === 0) {
      // Idle harmonic wave if no peaks cached yet
      const points: string[] = [];
      const count = 80;
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * totalWidth;
        const y = 50 + Math.sin(i * 0.25) * 8;
        points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
      return points.join(' ');
    }

    return peaks
      .map((peak, i) => {
        const x = (i / (peaks.length - 1)) * totalWidth;
        // Peak is 0.0 to 1.0. Scale from center (50) up and down
        const clamped = Math.max(0.05, Math.min(1.0, peak));
        const y = 50 - clamped * 40;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [peaks]);

  // Mirror path for symmetric dual-valve waveform
  const mirrorPathData = useMemo(() => {
    if (!peaks || peaks.length === 0) {
      const points: string[] = [];
      const count = 80;
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1)) * totalWidth;
        const y = 50 - Math.sin(i * 0.25) * 8;
        points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
      return points.join(' ');
    }

    return peaks
      .map((peak, i) => {
        const x = (i / (peaks.length - 1)) * totalWidth;
        const clamped = Math.max(0.05, Math.min(1.0, peak));
        const y = 50 + clamped * 40;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [peaks]);

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden rounded">
      <svg
        viewBox={`0 0 ${totalWidth} 100`}
        className="w-full h-full opacity-40 hover:opacity-70 transition-opacity"
        preserveAspectRatio="none"
      >
        {/* Upper & Lower Base Unplayed Waveform */}
        <path d={pathData} fill="none" stroke="#162231" strokeWidth="1.5" strokeLinecap="round" />
        <path d={mirrorPathData} fill="none" stroke="#162231" strokeWidth="1.5" strokeLinecap="round" />

        {/* Played Upper & Lower Waveform Highlight */}
        <path
          d={pathData}
          fill="none"
          stroke="#00f0ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${progress * totalWidth * 2}, ${totalWidth * 2}`}
          style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }}
        />
        <path
          d={mirrorPathData}
          fill="none"
          stroke="#00f0ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${progress * totalWidth * 2}, ${totalWidth * 2}`}
          style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }}
        />
      </svg>
    </div>
  );
};
