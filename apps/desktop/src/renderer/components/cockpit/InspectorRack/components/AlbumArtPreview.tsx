// apps/desktop/src/renderer/components/cockpit/InspectorRack/components/AlbumArtPreview.tsx
import React from 'react';
import type { Track } from '../../../../types/track.js';

export interface AlbumArtPreviewProps {
  coverArtUrl: string | null;
  track: Track | null;
}

export const AlbumArtPreview: React.FC<AlbumArtPreviewProps> = ({ coverArtUrl, track }) => {
  const getInitials = (text?: string | null) => {
    if (!text) return 'PR';
    return text
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  const getFormat = (fileName?: string | null, filePath?: string | null) => {
    const extFromFileName = fileName?.split('.').pop()?.toUpperCase();
    if (extFromFileName && extFromFileName.length <= 4) return extFromFileName;
    const extFromFilePath = filePath?.split('.').pop()?.toUpperCase();
    if (extFromFilePath && extFromFilePath.length <= 4) return extFromFilePath;
    return 'WAV';
  };

  const formatTag = getFormat(track?.file_name, track?.file_path);

  return (
    <div className="space-y-2.5">
      <div className="w-full h-40 bg-[#0b0e14] rounded-lg border border-[#1e2533] overflow-hidden flex items-center justify-center relative shadow-xl group">
        {coverArtUrl ? (
          <img src={coverArtUrl} alt="Cover Art" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full relative flex flex-col items-center justify-center p-3 overflow-hidden bg-radial from-[#131a26] via-[#090c12] to-[#06080b]">
            {/* Holographic Concentric Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
              <div className="w-40 h-40 rounded-full border border-[#00f0ff] animate-ping" style={{ animationDuration: '4s' }} />
              <div className="absolute w-28 h-28 rounded-full border border-dashed border-[#00f0ff]/40 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute w-16 h-16 rounded-full border border-[#00f0ff]/30" />
            </div>

            {/* Cybernetic Track Emblem */}
            <div className="w-12 h-12 rounded-lg bg-[#0e141f] border border-[#00f0ff]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)] z-10 mb-1.5">
              <span className="font-mono text-base font-bold text-[#00f0ff] tracking-widest">
                {getInitials(track?.title || track?.file_name)}
              </span>
            </div>

            {/* Format & Channel Badge */}
            <div className="flex items-center gap-1.5 z-10">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-bold">
                {formatTag}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-400">
                STEREO
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Format Badge */}
        {coverArtUrl && track && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs border border-zinc-700 text-[9px] font-mono text-[#00f0ff]">
            {formatTag}
          </div>
        )}
      </div>

      {track && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm truncate flex-1 pr-2">
              {track.title || track.file_name}
            </h3>
            {track.track_number && (
              <span className="text-[10px] text-zinc-500 font-mono">#{track.track_number}</span>
            )}
          </div>
          <p className="text-xs text-[#00f0ff] truncate font-medium">
            {track.artist_name || 'Unknown Artist'}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {track.album_name || 'Resonance Acoustic Vault'}
          </p>
        </div>
      )}
    </div>
  );
};
