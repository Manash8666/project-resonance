// apps/desktop/src/renderer/components/cockpit/ForgeViewport/components/KineticOverlay.tsx
import React from 'react';
import type { WordTimestamp } from 'library-core';

export interface KineticOverlayProps {
  activeWord: WordTimestamp | null;
}

export const KineticOverlay: React.FC<KineticOverlayProps> = ({ activeWord }) => {
  if (!activeWord) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        key={`${activeWord.word}-${activeWord.start}`}
        className="text-4xl md:text-5xl font-black font-sans uppercase tracking-tight text-white drop-shadow-[0_0_25px_rgba(0,240,255,0.8)] scale-110 animate-[pulse_0.15s_ease-out]"
        style={{
          textShadow: '0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px rgba(0,240,255,0.4)',
        }}
      >
        {activeWord.word}
      </div>
    </div>
  );
};
