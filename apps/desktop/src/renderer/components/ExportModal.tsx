// apps/desktop/src/renderer/components/ExportModal.tsx
import React, { useState, useEffect } from 'react';
import { Film, Sliders, FolderOpen, CheckCircle2, X, Download } from 'lucide-react';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioFilePath: string;
  trackTitle?: string;
  trackArtist?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audioFilePath,
  trackTitle = 'Audio Track',
  trackArtist = 'Unknown Artist',
}) => {
  const [resolution, setResolution] = useState<'1920x1080' | '3840x2160' | '2560x1440'>('1920x1080');
  const [codec, setCodec] = useState<'libx264' | 'libx265'>('libx264');
  const [fps, setFps] = useState<number>(60);
  const [customSavePath, setCustomSavePath] = useState<string>('');
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [exportComplete, setExportComplete] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isRendering) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRendering, onClose]);

  if (!isOpen) return null;

  const handleBrowseDestination = async () => {
    const defaultName = `${trackArtist} - ${trackTitle} (Resonance 4K).mp4`.replace(/[\\/:*?"<>|]/g, '_');
    const path = await window.resonance.selectSavePath(defaultName);
    if (path) {
      setCustomSavePath(path);
    }
  };

  const handleExport = async () => {
    setIsRendering(true);
    setProgress(0);
    setExportComplete(false);
    setStatusMsg('Spawning headless WebGL forge & initializing FFmpeg pipe...');

    const [width, height] = resolution.split('x').map(Number);
    const defaultOut = customSavePath || `Resonance_Export_${Date.now()}.mp4`;

    const cleanup = window.resonance.onRenderProgress((percent: number) => {
      setProgress(percent);
      setStatusMsg(`Forging frames... ${Math.round(percent)}% complete`);
    });

    try {
      const outputPath = await window.resonance.startRender({
        width,
        height,
        fps,
        codec,
        audioPath: audioFilePath,
        outputPath: defaultOut,
      });

      setStatusMsg(`✓ Export Complete: ${outputPath}`);
      setExportComplete(true);
    } catch (err) {
      console.error('Export pipeline error:', err);
      setStatusMsg(`Export Failed: ${String(err)}`);
    } finally {
      cleanup();
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none font-sans">
      <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-6 w-[520px] max-w-[95vw] shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5 relative panel-recessed overflow-hidden">
        {/* 4 Corner Hardware Screws */}
        <div className="absolute top-2 left-2 rack-screw" />
        <div className="absolute top-2 right-2 rack-screw" />
        <div className="absolute bottom-2 left-2 rack-screw" />
        <div className="absolute bottom-2 right-2 rack-screw" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3 px-1">
          <div className="flex items-center space-x-2 pl-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ffff] shadow-[0_0_8px_#00ffff] animate-pulse" />
            <h2 className="font-mono text-xs font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <Film className="w-4 h-4 text-[#00ffff]" />
              Offline Frame-Stepper Export Pipeline
            </h2>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-[#18181b] transition-colors cursor-pointer mr-3"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Source Track Telemetry Box */}
        <div className="p-3 rounded-xs bg-[#050505] border border-[#27272a] flex items-center justify-between text-xs font-mono overflow-hidden">
          <div className="overflow-hidden pr-3 min-w-0">
            <span className="text-zinc-500 text-[10px] block uppercase font-sans tracking-wider">
              Source Audio Telemetry
            </span>
            <span className="text-white font-bold truncate block">{trackTitle}</span>
            <span className="text-zinc-400 text-[11px] truncate block">{trackArtist}</span>
          </div>
          <span className="px-2 py-0.5 rounded-xs bg-[#18181b] border border-[#00ffff]/40 text-[#00ffff] text-[10px] uppercase font-bold shrink-0">
            {audioFilePath.startsWith('data:') ? 'WAV' : (audioFilePath.split('.').pop() || 'AUDIO').toUpperCase().slice(0, 5)}
          </span>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4 text-xs font-mono">
          {/* Resolution Profile */}
          <div>
            <label className="block text-[10px] font-sans font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Output Resolution Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResolution('1920x1080')}
                className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                  resolution === '1920x1080'
                    ? 'bg-[#18181b] border-[#00ffff] text-white shadow-[0_0_12px_rgba(0,255,255,0.2)]'
                    : 'bg-[#050505] border-[#27272a] text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <div className="font-bold text-xs text-[#00ffff]">1080p FULL HD</div>
                <div className="text-[10px] text-zinc-400 font-sans">1920x1080 Rapid Proofing</div>
              </button>

              <button
                type="button"
                onClick={() => setResolution('3840x2160')}
                className={`p-3 rounded-xs border text-left transition-all cursor-pointer ${
                  resolution === '3840x2160'
                    ? 'bg-[#18181b] border-[#00ffff] text-white shadow-[0_0_12px_rgba(0,255,255,0.2)]'
                    : 'bg-[#050505] border-[#27272a] text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <div className="font-bold text-xs text-[#00ffff]">4K ULTRA HD</div>
                <div className="text-[10px] text-zinc-400 font-sans">3840x2160 Master VP9 Profile</div>
              </button>
            </div>
          </div>

          {/* Codec & FPS Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Video Codec
              </label>
              <select
                value={codec}
                onChange={(e) => setCodec(e.target.value as 'libx264' | 'libx265')}
                disabled={isRendering}
                className="w-full h-8 px-2 bg-[#050505] border border-[#27272a] focus:border-[#00ffff] rounded-xs text-[#00ffff] font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="libx264">H.264 (Universal)</option>
                <option value="libx265">H.265 / HEVC (High Efficiency)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-sans font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Framerate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                disabled={isRendering}
                className="w-full h-8 px-2 bg-[#050505] border border-[#27272a] focus:border-[#00ffff] rounded-xs text-[#00ffff] font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value={60}>60 FPS (Ultra Smooth)</option>
                <option value={30}>30 FPS (Standard)</option>
              </select>
            </div>
          </div>

          {/* Destination Path Selector */}
          <div>
            <label className="block text-[10px] font-sans font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Destination File
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                placeholder="Default: Videos / Resonance_Export.mp4"
                value={customSavePath}
                className="flex-1 h-8 px-3 bg-[#050505] border border-[#27272a] rounded-xs text-zinc-300 font-mono text-[11px] truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBrowseDestination}
                disabled={isRendering}
                className="px-3 h-8 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00ffff]/40 text-zinc-200 font-mono text-xs rounded-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#00ffff]" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Rendering Progress Bar & Status */}
          {(isRendering || exportComplete) && (
            <div className="p-3 bg-[#050505] border border-[#27272a] rounded-xs space-y-2 font-mono">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="text-[#00ffff] animate-pulse">● {statusMsg}</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-[#18181b] h-2 rounded-xs overflow-hidden border border-[#27272a]">
                <div
                  className="bg-[#00ffff] h-full transition-all duration-300 shadow-[0_0_8px_#00ffff]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#27272a]">
          <button
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2 rounded-xs bg-[#18181b] hover:bg-[#27272a] text-xs font-mono text-zinc-300 transition-colors cursor-pointer disabled:opacity-50 border border-[#27272a]"
          >
            {exportComplete ? 'CLOSE' : 'CANCEL'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isRendering}
            className="px-5 py-2 rounded-xs bg-[#00ffff] hover:bg-[#3bf3ff] text-black font-mono font-bold text-xs transition-all shadow-[0_0_16px_rgba(0,255,255,0.4)] active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {exportComplete ? (
              <CheckCircle2 className="w-4 h-4 text-black" />
            ) : (
              <Download className="w-4 h-4 text-black" />
            )}
            <span>{isRendering ? 'FORGING VIDEO...' : 'INITIALIZE OFFLINE EXPORT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
