// apps/desktop/src/renderer/components/cockpit/HeaderBar/index.tsx
import React, { useState, useEffect } from 'react';
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
  Play,
  Pause,
  Square,
  Activity,
} from 'lucide-react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { audioEngine } from '../../../audio/AudioEngine.js';

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
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const currentTime = useResonanceStore((s) => s.currentTime);
  const duration = useResonanceStore((s) => s.duration);

  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60.0);

  // Measure active rendering FPS dynamically
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime) * 10) / 10);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
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

  const handleGlobalPlayPause = async () => {
    if (!selectedTrack) {
      const all = useResonanceStore.getState().tracks;
      if (all.length > 0) {
        useResonanceStore.getState().setSelectedTrackId(all[0].id);
        useResonanceStore.getState().setSelectedTrack(all[0]);
        await audioEngine.loadTrack(all[0].file_path);
      }
    }
    await audioEngine.toggle();
  };

  const handleGlobalStop = () => {
    audioEngine.pause();
    audioEngine.seek(0);
  };

  const formatSMPTE = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
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
    <header className="flex flex-col bg-[#050505] border-b border-[#27272a] font-mono select-none z-20 shrink-0">
      {/* ─── Level 1: Application Menu Bar & Global Window Controls (32px) ─── */}
      <div
        onDoubleClick={() => window.resonance?.maximizeWindow?.()}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="h-8 border-b border-[#18181b] flex items-center justify-between pl-3 pr-0 overflow-hidden"
      >
        {/* Brand Logo & Menus */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ffff] shadow-[0_0_8px_#00ffff] animate-pulse" />
            <span className="font-bold tracking-widest text-[11px] uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent whitespace-nowrap">
              PROJECT RESONANCE
            </span>
          </div>

          {/* Menus (No-drag) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="hidden sm:flex items-center gap-0.5 text-[11px] text-zinc-400 ml-1"
          >
            {['File', 'Edit', 'Tools', 'View', 'Audio', 'Help'].map((item) => (
              <button
                key={item}
                onClick={() => setActiveMenu(activeMenu === item ? null : item)}
                className={`px-1.5 py-0.5 rounded hover:bg-[#18181b] hover:text-white transition-colors cursor-pointer text-[10px] uppercase tracking-wider ${
                  activeMenu === item ? 'bg-[#18181b] text-white' : ''
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Global Transport + SMPTE Timecode (No-drag) */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2"
        >
          {/* Global Play / Pause / Stop */}
          <div className="flex items-center bg-[#0a0a0a] border border-[#27272a] rounded p-0.5 shadow-inner">
            <button
              type="button"
              onClick={handleGlobalPlayPause}
              className={`p-1 rounded cursor-pointer transition-colors ${
                isPlaying ? 'bg-[#00ffff] text-black' : 'text-zinc-300 hover:text-[#00ffff] hover:bg-[#18181b]'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={handleGlobalStop}
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-[#18181b] cursor-pointer transition-colors"
              title="Stop & Return to Zero"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>

          {/* Session Title & Timecode */}
          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#27272a] rounded px-2.5 py-0.5 text-[10px]">
            <span className="text-zinc-500 hidden md:inline">Session:</span>
            <span className="text-zinc-200 font-bold max-w-[140px] truncate">
              {selectedTrack ? selectedTrack.title || selectedTrack.file_name : 'No Track'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-[#00ffff] font-mono tracking-wider font-bold">
              {formatSMPTE(currentTime)}
            </span>
          </div>
        </div>

        {/* Right Action Utilities & Window Controls */}
        <div className="flex items-center shrink-0">
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-2 mr-2"
          >
            {/* Real-time FPS Counter Badge */}
            <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-[#27272a] text-[10px] text-zinc-400">
              <Activity className="w-3 h-3 text-[#00ffff]" />
              <span className="font-mono text-[#00ffff] font-bold">{fps.toFixed(1)}</span>
              <span className="text-[9px] text-zinc-500">FPS</span>
            </div>

            {/* Auto-Immersive Toggle */}
            <button
              type="button"
              onClick={() => setAutoImmersiveEnabled(!autoImmersiveEnabled)}
              className={`h-5 px-1.5 rounded border text-[9px] tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                autoImmersiveEnabled
                  ? 'bg-[#00ffff]/10 border-[#00ffff]/50 text-[#00ffff]'
                  : 'bg-[#0a0a0a] border-[#27272a] text-zinc-500 hover:text-zinc-300'
              }`}
              title="Auto-enter Immersive Mode on idle playback (20s inactivity)"
            >
              <span
                className={`w-1 h-1 rounded-full ${
                  autoImmersiveEnabled ? 'bg-[#00ffff] animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span>AUTO</span>
            </button>

            {/* Immersive Trigger */}
            <button
              type="button"
              onClick={() => setIsImmersive(true)}
              className="h-5 px-2 bg-[#0a0a0a] hover:bg-[#18181b] border border-[#27272a] hover:border-[#00ffff]/60 text-[9px] text-zinc-300 hover:text-white rounded transition-all flex items-center gap-1 cursor-pointer"
              title="Enter Fullscreen 3D Visualizer (Hotkey: F)"
            >
              <Maximize2 className="w-2.5 h-2.5 text-[#00ffff]" />
              <span className="font-semibold">IMMERSIVE</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              disabled={!selectedTrack}
              className="h-6 px-2.5 bg-gradient-to-r from-[#00ffff] to-[#00c8b3] hover:from-[#38bdf8] hover:to-[#00ffff] text-black font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,255,255,0.25)] active:scale-95"
              title="Render 4K / 60FPS Video Export"
            >
              <span>Export</span>
              <ChevronDown className="w-2.5 h-2.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Window Controls (Minimize, Maximize, Close) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center h-8 border-l border-[#27272a] shrink-0"
          >
            <button
              type="button"
              onClick={() => window.resonance?.minimizeWindow?.()}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
                <rect width="10" height="1" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => window.resonance?.maximizeWindow?.()}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
              className="w-9 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
              title="Close (Alt+F4)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M0.7 0L5 4.3 9.3 0 10 0.7 5.7 5 10 9.3 9.3 10 5 5.7 0.7 10 0 9.3 4.3 5 0 0.7z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Level 2: Module Ribbon Tabs (32px) ─── */}
      <div className="h-8 bg-[#0a0a0a] px-3 flex items-center justify-between border-b border-[#27272a] overflow-x-auto">
        <div className="flex items-center gap-1">
          {ribbonTabs.map((tab) => {
            const isActive = activeRibbonTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => onRibbonTabChange?.(tab.id)}
                className={`h-6 px-2.5 rounded flex items-center gap-1.5 text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#18181b] text-[#00ffff] border-b-2 border-b-[#00ffff] font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-[#111111]'
                }`}
              >
                <TabIcon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scan Folder Action Button */}
        <div className="flex items-center gap-2">
          {scanStatus && (
            <span className="text-[10px] text-[#00ffff] animate-pulse mr-2 hidden md:inline">
              {scanStatus}
            </span>
          )}
          <button
            onClick={handleScanFolder}
            disabled={isScanning}
            className="px-2 py-0.5 bg-[#111111] hover:bg-[#18181b] border border-[#27272a] hover:border-[#00ffff]/50 rounded text-[10px] uppercase text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <FolderPlus className="w-3 h-3 text-[#00ffff]" />
            <span>{isScanning ? 'Scanning...' : 'Scan Folder'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
