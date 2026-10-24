// apps/desktop/src/renderer/components/cockpit/HeaderBar/index.tsx
import React, { useState } from 'react';
import {
  Folder,
  Music,
  Type,
  Layers,
  Sparkles,
  Palette,
  LayoutGrid,
  FolderPlus,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';

export interface HeaderBarProps {
  onScan?: () => void;
  activeRibbonTab?: string;
  onRibbonTabChange?: (tab: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onScan,
  activeRibbonTab = 'media',
  onRibbonTabChange,
}) => {
  const isScanning = useResonanceStore((s) => s.scanStatus === 'loading');
  const setScanStatusStore = useResonanceStore((s) => s.setScanStatus);
  const setTracks = useResonanceStore((s) => s.setTracks);
  const setTrackCount = useResonanceStore((s) => s.setTrackCount);
  const setExportModalOpen = useResonanceStore((s) => s.setExportModalOpen);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const autoImmersiveEnabled = useResonanceStore((s) => s.autoImmersiveEnabled);
  const setAutoImmersiveEnabled = useResonanceStore((s) => s.setAutoImmersiveEnabled);
  const setIsImmersive = useResonanceStore((s) => s.setIsImmersive);

  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  React.useEffect(() => {
    window.resonance?.isWindowMaximized?.().then((max) => {
      if (typeof max === 'boolean') setIsMaximized(max);
    });
    const cleanup = window.resonance?.onWindowMaximizedChange?.((max) => {
      setIsMaximized(max);
    });
    return () => cleanup?.();
  }, []);

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

  const ribbonTabs = [
    { id: 'media', label: 'Media', Icon: Folder },
    { id: 'audio', label: 'Audio', Icon: Music },
    { id: 'titles', label: 'Titles', Icon: Type },
    { id: 'transitions', label: 'Transitions', Icon: Layers },
    { id: 'effects', label: 'Effects', Icon: Sparkles },
    { id: 'shaders', label: 'Shaders', Icon: Palette },
    { id: 'templates', label: 'Templates', Icon: LayoutGrid },
  ];

  return (
    <header className="flex flex-col bg-[#080a0e] border-b border-[#1c222c] font-mono select-none z-20 shrink-0">
      {/* ─── Level 1: Application Menu Bar & Global Window Controls ─── */}
      <div
        onDoubleClick={() => window.resonance?.maximizeWindow?.()}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="h-9 border-b border-[#141b26] flex items-center justify-between pl-3 pr-0 overflow-hidden"
      >
        {/* Brand Logo & Menus */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <span className="font-bold tracking-wider text-xs bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent whitespace-nowrap">
              PROJECT RESONANCE
            </span>
          </div>

          {/* Filmora-style Dropdown Menus (No-drag) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-0.5 text-[11px] text-zinc-400 ml-2"
          >
            {['File', 'Edit', 'Tools', 'View', 'Audio', 'Help'].map((item) => (
              <button
                key={item}
                onClick={() => setActiveMenu(activeMenu === item ? null : item)}
                className={`px-2 py-1 rounded hover:bg-[#161d2b] hover:text-white transition-colors cursor-pointer ${
                  activeMenu === item ? 'bg-[#161d2b] text-white' : ''
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Center Project Title (Filmora style) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 truncate max-w-sm">
          <span className="text-zinc-600">Session:</span>
          <span className="text-zinc-200 font-bold truncate">
            {selectedTrack ? selectedTrack.title || selectedTrack.file_name : 'Untitled Audio Space'}
          </span>
          <span className="text-[10px] text-zinc-600">v0.1.0-RC</span>
        </div>

        {/* Right Action Utilities & Window Controls */}
        <div className="flex items-center shrink-0">
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-2 mr-3"
          >
            {/* Auto-Immersive Toggle */}
            <button
              type="button"
              onClick={() => setAutoImmersiveEnabled(!autoImmersiveEnabled)}
              className={`h-6 px-2 rounded border text-[10px] tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                autoImmersiveEnabled
                  ? 'bg-[#00f0ff]/10 border-[#00f0ff]/50 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'bg-[#10131a] border-[#1f2736] text-zinc-400 hover:text-zinc-200'
              }`}
              title="Auto-enter Immersive Mode on idle playback (20s inactivity)"
            >
              <span
                className={`w-1 h-1 rounded-full ${
                  autoImmersiveEnabled ? 'bg-[#00f0ff] animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span>AUTO</span>
            </button>

            {/* Immersive Trigger */}
            <button
              type="button"
              onClick={() => setIsImmersive(true)}
              className="h-6 px-2 bg-[#10131a] hover:bg-[#161d2b] border border-[#1f2736] hover:border-[#00f0ff]/60 text-[10px] text-zinc-300 hover:text-white rounded transition-all flex items-center gap-1.5 cursor-pointer"
              title="Enter Fullscreen 3D Visualizer (Hotkey: F)"
            >
              <Maximize2 className="w-3 h-3 text-[#00f0ff]" />
              <span className="font-semibold">IMMERSIVE</span>
            </button>

            {/* Filmora Prominent Export Button */}
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              disabled={!selectedTrack}
              className="h-7 px-3.5 bg-gradient-to-r from-[#00f0ff] to-[#00c8b3] hover:from-[#38bdf8] hover:to-[#00f0ff] text-black font-bold text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,240,255,0.35)] active:scale-95"
              title="Render 4K / 60FPS Video Export"
            >
              <span>Export</span>
              <ChevronDown className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          {/* Window Controls (Minimize, Maximize, Close) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center h-9 border-l border-[#1c222c] shrink-0"
          >
            <button
              type="button"
              onClick={() => window.resonance?.minimizeWindow?.()}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
                <rect width="10" height="1" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => window.resonance?.maximizeWindow?.()}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isMaximized ? 'Restore Down' : 'Maximize'}
            >
              {isMaximized ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 0v2H0v8h8V8h2V0H2zm6 8H1V3h7v5zm1-2V1H3v1h5v4h1z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.resonance?.closeWindow?.()}
              className="w-10 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
              title="Close (Alt+F4)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M0.7 0L5 4.3 9.3 0 10 0.7 5.7 5 10 9.3 9.3 10 5 5.7 0.7 10 0 9.3 4.3 5 0 0.7z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Level 2: Filmora-Style Module Ribbon Tabs ─── */}
      <div className="h-10 bg-[#07090d] px-3 flex items-center justify-between border-b border-[#141b26] overflow-x-auto">
        <div className="flex items-center gap-1">
          {ribbonTabs.map((tab) => {
            const isActive = activeRibbonTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => onRibbonTabChange?.(tab.id)}
                className={`h-8 px-3 rounded flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#14233a] text-[#00f0ff] border-b-2 border-b-[#00f0ff] font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#0f141f]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scan Folder Action Button in Ribbon */}
        <div className="flex items-center gap-2">
          {scanStatus && (
            <span className="text-[10px] text-[#00f0ff] animate-pulse mr-2 hidden md:inline">
              {scanStatus}
            </span>
          )}
          <button
            onClick={handleScanFolder}
            disabled={isScanning}
            className="px-2.5 py-1 bg-[#10141d] hover:bg-[#161d2b] border border-[#1e2736] hover:border-[#00f0ff]/50 rounded text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>{isScanning ? 'Scanning...' : 'Scan Folder'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
