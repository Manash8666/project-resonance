// apps/desktop/src/renderer/components/cockpit/HeaderBar/index.tsx
import React, { useState } from 'react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';

export interface HeaderBarProps {
  onScan?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onScan }) => {
  const isScanning = useResonanceStore((s) => s.scanStatus === 'loading');
  const setScanStatusStore = useResonanceStore((s) => s.setScanStatus);
  const setTracks = useResonanceStore((s) => s.setTracks);
  const setTrackCount = useResonanceStore((s) => s.setTrackCount);
  const trackCount = useResonanceStore((s) => s.trackCount);
  const searchQuery = useResonanceStore((s) => s.searchQuery);
  const setSearchQuery = useResonanceStore((s) => s.setSearchQuery);
  const setExportModalOpen = useResonanceStore((s) => s.setExportModalOpen);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);

  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const handleScanFolder = async () => {
    if (onScan) {
      onScan();
      return;
    }
    if (!window.resonance?.openFolder) return;
    try {
      const folderPath = await window.resonance.openFolder();
      if (!folderPath) return;

      setScanStatusStore('loading');
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
      setScanStatusStore('idle');
    }
  };

  return (
    <header className="h-12 bg-[#080a0e] border-b border-[#1c222c] flex items-center justify-between px-4 font-mono select-none z-20">
      {/* Brand & Telemetry Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
          <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            PROJECT RESONANCE
          </span>
        </div>
        <span className="text-[10px] text-zinc-600">v0.1.0-RC</span>
        <span className="text-zinc-700">|</span>
        <span className="text-xs text-zinc-400">
          VAULT: <strong className="text-[#00f0ff]">{trackCount}</strong> TRACKS
        </span>
      </div>

      {/* Quick FTS5 Search Input */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FTS5 SEARCH: Title, Artist, Album, Genre..."
            className="w-full bg-[#0f131a] border border-[#1e2533] focus:border-[#00f0ff] rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {scanStatus && (
          <span className="text-[11px] text-[#00f0ff] animate-pulse">
            {scanStatus}
          </span>
        )}

        <button
          onClick={handleScanFolder}
          disabled={isScanning}
          className="px-3 py-1.5 bg-[#121620] hover:bg-[#1a2130] border border-[#232b3b] hover:border-[#00f0ff]/50 text-xs text-zinc-200 rounded transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>{isScanning ? 'SCANNING...' : 'SCAN MUSIC FOLDER'}</span>
        </button>

        <button
          onClick={() => setExportModalOpen(true)}
          disabled={!selectedTrack}
          className="px-3 py-1.5 bg-[#14233a] hover:bg-[#1b3152] border border-[#00f0ff]/40 hover:border-[#00f0ff] text-xs text-[#00f0ff] font-bold rounded transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.15)]"
        >
          <span>EXPORT 4K / 60FPS</span>
        </button>
      </div>
    </header>
  );
};
