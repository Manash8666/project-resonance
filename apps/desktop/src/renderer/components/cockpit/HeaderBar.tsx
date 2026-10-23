// apps/desktop/src/renderer/components/cockpit/HeaderBar.tsx
import React, { useState } from 'react';
import { useResonanceStore } from '../../store/useResonanceStore.js';

export const HeaderBar: React.FC = () => {
  const isScanning = useResonanceStore((s) => s.isScanning);
  const setScanning = useResonanceStore((s) => s.setScanning);
  const setTracks = useResonanceStore((s) => s.setTracks);
  const setTrackCount = useResonanceStore((s) => s.setTrackCount);
  const trackCount = useResonanceStore((s) => s.trackCount);
  const searchQuery = useResonanceStore((s) => s.searchQuery);
  const setSearchQuery = useResonanceStore((s) => s.setSearchQuery);
  const setExportModalOpen = useResonanceStore((s) => s.setExportModalOpen);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);

  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const handleScanFolder = async () => {
    if (!window.resonance?.openFolder) return;
    try {
      const folderPath = await window.resonance.openFolder();
      if (!folderPath) return;

      setScanning(true);
      setScanStatus('Scanning audio files...');

      const result = await window.resonance.scanDirectory(folderPath);
      setScanStatus(`Scanned ${result.added} added, ${result.skipped} cached.`);

      const [freshTracks, freshCount] = await Promise.all([
        window.resonance.getTracks(2000, 0),
        window.resonance.getTrackCount(),
      ]);
      setTracks(freshTracks as any);
      setTrackCount(freshCount);

      setTimeout(() => setScanStatus(null), 3000);
    } catch (err) {
      console.error('Scan failed:', err);
      setScanStatus(`Scan failed: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="h-11 bg-[#090c12] border-b border-[#1c222c] flex items-center justify-between px-4 select-none z-30">
      {/* Left: App Title & Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <h1 className="text-xs font-mono font-bold tracking-[0.25em] text-white uppercase">
            PROJECT RESONANCE
          </h1>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-[#121620] px-2 py-0.5 rounded border border-[#1e2533]">
          {trackCount.toLocaleString()} TRACKS
        </span>
      </div>

      {/* Center: Search Bar */}
      <div className="relative w-80">
        <input
          type="text"
          placeholder="Search FTS5 database (artist, album, title)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-7 pl-8 pr-7 bg-[#0e1117] border border-[#1e2533] focus:border-[#00f0ff] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors font-mono"
        />
        <svg
          className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1.5 text-zinc-500 hover:text-white cursor-pointer text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 font-mono text-xs">
        {scanStatus && (
          <span className="text-[11px] text-[#00f0ff] animate-pulse mr-2 truncate max-w-xs">
            {scanStatus}
          </span>
        )}

        <button
          onClick={handleScanFolder}
          disabled={isScanning}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#121620] hover:bg-[#1a2130] border border-[#232b3b] text-zinc-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <span>{isScanning ? 'Scanning...' : 'Scan Music Folder'}</span>
        </button>

        <button
          onClick={() => setExportModalOpen(true)}
          disabled={!selectedTrack}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#101b26] hover:bg-[#152538] border border-[#00f0ff]/40 text-[#00f0ff] hover:text-white font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
        >
          <span>⚡ EXPORT 4K</span>
        </button>
      </div>
    </div>
  );
};
