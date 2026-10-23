// apps/desktop/src/renderer/components/cockpit/InspectorRack/components/AlbumArtPreview.tsx
import React from 'react';
import type { Track } from '../../../../types/track.js';

export interface AlbumArtPreviewProps {
  coverArtUrl: string | null;
  track: Track | null;
}

export const AlbumArtPreview: React.FC<AlbumArtPreviewProps> = ({ coverArtUrl, track }) => {
  return (
    <div className="space-y-3">
      <div className="w-full aspect-square bg-[#0e121a] rounded border border-[#1e2533] overflow-hidden flex items-center justify-center relative shadow-lg">
        {coverArtUrl ? (
          <img src={coverArtUrl} alt="Cover Art" className="w-full h-full object-cover" />
        ) : (
          <div className="text-zinc-600 flex flex-col items-center space-y-1">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span className="text-[9px] uppercase">No Cover Art</span>
          </div>
        )}
      </div>

      {track && (
        <div className="space-y-0.5">
          <h3 className="font-bold text-white text-sm truncate">{track.title || track.file_name}</h3>
          <p className="text-xs text-[#00f0ff] truncate">{track.artist_name || 'Unknown Artist'}</p>
          <p className="text-[11px] text-zinc-500 truncate">{track.album_name || 'Unknown Album'}</p>
        </div>
      )}
    </div>
  );
};
