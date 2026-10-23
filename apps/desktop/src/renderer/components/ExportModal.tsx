// apps/desktop/src/renderer/components/ExportModal.tsx
import React, { useState } from 'react';

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

    // Listen for streaming progress from FFmpeg worker
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
      <div className="bg-[#0e1117] border border-[#232b3b] rounded-xl p-6 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1c222c] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <h2 className="font-mono text-sm font-bold text-white tracking-widest uppercase">
              OFFLINE FRAME-STEPPER EXPORT PIPELINE
            </h2>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Source Track Telemetry Box */}
        <div className="p-3 rounded-lg bg-[#121620] border border-[#1f2635] flex items-center justify-between text-xs font-mono">
          <div className="overflow-hidden pr-3">
            <span className="text-zinc-500 text-[10px] block uppercase">SOURCE AUDIO TELEMETRY</span>
            <span className="text-white font-bold truncate block">{trackTitle}</span>
            <span className="text-zinc-400 text-[11px] truncate block">{trackArtist}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#182333] border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] uppercase font-bold shrink-0">
            {audioFilePath.split('.').pop() || 'AUDIO'}
          </span>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4 text-xs">
          {/* Resolution Profile */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
              Output Resolution Profile
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                type="button"
                onClick={() => setResolution('1920x1080')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  resolution === '1920x1080'
                    ? 'bg-[#14233a] border-[#00f0ff] text-white shadow-sm'
                    : 'bg-[#121620] border-[#232b3b] text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="font-bold text-xs text-[#00f0ff]">1080p FULL HD</div>
                <div className="text-[10px] text-zinc-400">Rapid Proof (Fast Encoding)</div>
              </button>

              <button
                type="button"
                onClick={() => setResolution('3840x2160')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  resolution === '3840x2160'
                    ? 'bg-[#14233a] border-[#00f0ff] text-white shadow-sm'
                    : 'bg-[#121620] border-[#232b3b] text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="font-bold text-xs text-[#00f0ff]">4K ULTRA HD</div>
                <div className="text-[10px] text-zinc-400">YouTube VP9/AV1 Gold Profile</div>
              </button>
            </div>
          </div>

          {/* Codec & FPS Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                Video Codec
              </label>
              <select
                value={codec}
                onChange={(e) => setCodec(e.target.value as 'libx264' | 'libx265')}
                disabled={isRendering}
                className="w-full h-8 px-2 bg-[#121620] border border-[#232b3b] focus:border-[#00f0ff] rounded text-zinc-200 text-xs font-mono focus:outline-none"
              >
                <option value="libx264">H.264 (Universal Compatibility)</option>
                <option value="libx265">H.265 / HEVC (High Efficiency)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                Framerate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                disabled={isRendering}
                className="w-full h-8 px-2 bg-[#121620] border border-[#232b3b] focus:border-[#00f0ff] rounded text-zinc-200 text-xs font-mono focus:outline-none"
              >
                <option value={60}>60 FPS (Ultra Smooth Telemetry)</option>
                <option value={30}>30 FPS (Standard)</option>
              </select>
            </div>
          </div>

          {/* Destination Path Selector */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
              Destination File
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                placeholder="Default: Videos / Resonance_Export.mp4"
                value={customSavePath}
                className="flex-1 h-8 px-3 bg-[#121620] border border-[#232b3b] rounded text-zinc-300 font-mono text-[11px] truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBrowseDestination}
                disabled={isRendering}
                className="px-3 h-8 bg-[#182333] hover:bg-[#202d42] border border-[#29374d] text-zinc-200 font-mono text-xs rounded transition-all cursor-pointer"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Rendering Progress Bar & Status */}
          {(isRendering || exportComplete) && (
            <div className="p-3 bg-[#0a0c10] border border-[#1e2533] rounded-lg space-y-2 font-mono">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="text-[#00f0ff] animate-pulse">● {statusMsg}</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-[#182333] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#00f0ff] h-full transition-all duration-300 shadow-[0_0_8px_#00f0ff]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1c222c]">
          <button
            type="button"
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2 rounded bg-[#161a22] hover:bg-[#1f2532] text-xs font-mono text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isRendering}
            className="px-5 py-2 rounded bg-[#00f0ff] hover:bg-[#3bf3ff] text-black font-mono font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isRendering ? 'FORGING VIDEO...' : 'INITIALIZE OFFLINE EXPORT'}
          </button>
        </div>
      </div>
    </div>
  );
};
