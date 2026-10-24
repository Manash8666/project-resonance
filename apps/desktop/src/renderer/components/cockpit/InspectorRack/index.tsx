// apps/desktop/src/renderer/components/cockpit/InspectorRack/index.tsx
import React, { useState } from 'react';
import {
  RotateCcw,
  Link2,
  Unlink,
  FlipHorizontal,
  FlipVertical,
  Type,
  Video,
  Volume2,
  Sparkles,
  Sliders,
  Check,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';
import { useResonanceStore } from '../../../store/useResonanceStore.js';
import { ShaderTuning } from './components/ShaderTuning.js';

export interface InspectorRackProps {
  coverArtUrl?: string | null;
  onAutoTranscribe?: () => Promise<void>;
  isTranscribing?: boolean;
  transcriptionStatus?: string | null;
}

export const InspectorRack: React.FC<InspectorRackProps> = ({
  coverArtUrl = null,
  onAutoTranscribe,
  isTranscribing: externalIsTranscribing,
  transcriptionStatus: externalStatus,
}) => {
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);
  const setTracks = useResonanceStore((s) => s.setTracks);
  const activeLyrics = useResonanceStore((s) => s.activeLyrics);
  const setActiveLyrics = useResonanceStore((s) => s.setActiveLyrics);
  const currentTime = useResonanceStore((s) => s.currentTime);

  const [mainTab, setMainTab] = useState<'video' | 'text' | 'audio'>('video');
  const [subTab, setSubTab] = useState<'basic' | 'shader' | 'ai'>('basic');

  // Transform Hardware State
  const [transformEnabled, setTransformEnabled] = useState(true);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [isScaleLinked, setIsScaleLinked] = useState(true);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [compositingEnabled, setCompositingEnabled] = useState(true);
  const [blendMode, setBlendMode] = useState<'normal' | 'screen' | 'add' | 'multiply'>('screen');
  const [opacity, setOpacity] = useState(100);

  const [internalIsTranscribing, setInternalIsTranscribing] = useState(false);
  const [internalStatus, setInternalStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedTrack?.id) {
      setActiveLyrics(null);
      return;
    }
    window.resonance?.getLyrics?.(selectedTrack.id)
      .then((lyrics) => {
        if (Array.isArray(lyrics) && lyrics.length > 0) {
          setActiveLyrics(lyrics);
        } else {
          setActiveLyrics(null);
        }
      })
      .catch(() => setActiveLyrics(null));
  }, [selectedTrack?.id, setActiveLyrics]);

  const isTranscribing = externalIsTranscribing ?? internalIsTranscribing;
  const transcriptionStatus = externalStatus ?? internalStatus;

  const handleAutoTranscribeInternal = async () => {
    if (onAutoTranscribe) {
      await onAutoTranscribe();
      return;
    }
    if (!selectedTrack) return;
    setInternalIsTranscribing(true);
    setInternalStatus('Whisper AI: Calculating word-level timestamps...');
    try {
      const timestamps = await window.resonance.transcribeTrack(selectedTrack.file_path);
      await window.resonance.saveLyrics(selectedTrack.id, timestamps, timestamps.length === 0);
      setActiveLyrics(timestamps);
      setSelectedTrack({ ...selectedTrack, has_lyrics: timestamps.length > 0 ? 1 : 0 });
      setTracks(
        useResonanceStore.getState().tracks.map((t) =>
          t.id === selectedTrack.id ? { ...t, has_lyrics: timestamps.length > 0 ? 1 : 0 } : t
        )
      );
      setInternalStatus(`✓ Transcribed: ${timestamps.length} words synchronized.`);
      setTimeout(() => setInternalStatus(null), 3000);
    } catch (err) {
      setInternalStatus(`Error: ${String(err)}`);
    } finally {
      setInternalIsTranscribing(false);
    }
  };

  const handleResetTransform = () => {
    setScaleX(100);
    setScaleY(100);
    setPosX(0);
    setPosY(0);
    setRotationAngle(0);
    setOpacity(100);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-[#27272a] font-mono select-none overflow-hidden text-xs">
      {/* ─── 1. Hardware Rack Unit Header Bar ─── */}
      <div className="h-8 bg-[#0e0e11] border-b border-[#27272a] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="rack-screw" />
          <span className="font-sans font-bold text-[10px] text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#00ffff]" />
            The Rack // Attributes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-zinc-500 bg-[#050505] px-1.5 py-0.5 rounded border border-[#27272a]">
            MOD-04
          </span>
          <div className="rack-screw" />
        </div>
      </div>

      {/* ─── 2. Main Navigation Ribbon Tabs (Video, Text, Audio) ─── */}
      <div className="h-8 bg-[#070709] border-b border-[#27272a] flex items-center px-2 gap-1 shrink-0 text-[11px] font-sans">
        <button
          onClick={() => setMainTab('video')}
          className={`flex-1 py-1 rounded-xs uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mainTab === 'video'
              ? 'bg-[#18181b] text-[#00ffff] border-b-2 border-b-[#00ffff] shadow-[0_2px_8px_rgba(0,255,255,0.2)]'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#111114]'
          }`}
        >
          <Video className="w-3 h-3 text-current" />
          <span>Video</span>
        </button>

        <button
          onClick={() => setMainTab('text')}
          className={`flex-1 py-1 rounded-xs uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mainTab === 'text'
              ? 'bg-[#18181b] text-[#00ffff] border-b-2 border-b-[#00ffff] shadow-[0_2px_8px_rgba(0,255,255,0.2)]'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#111114]'
          }`}
        >
          <Type className="w-3 h-3 text-current" />
          <span>Text</span>
        </button>

        <button
          onClick={() => setMainTab('audio')}
          className={`flex-1 py-1 rounded-xs uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mainTab === 'audio'
              ? 'bg-[#18181b] text-[#00ffff] border-b-2 border-b-[#00ffff] shadow-[0_2px_8px_rgba(0,255,255,0.2)]'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#111114]'
          }`}
        >
          <Volume2 className="w-3 h-3 text-current" />
          <span>Audio</span>
        </button>
      </div>

      {/* ─── 3. Sub-Category Tabs (Basic, Shader FX, AI Tools) ─── */}
      <div className="h-7 bg-[#0a0a0c] border-b border-[#1f1f23] flex items-center px-3 gap-2 shrink-0 text-[10px] font-mono">
        <button
          onClick={() => setSubTab('basic')}
          className={`px-2 py-0.5 rounded-xs cursor-pointer transition-all ${
            subTab === 'basic'
              ? 'bg-[#18181b] text-[#00ffff] font-bold border border-[#00ffff]/40'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          BASIC
        </button>
        <button
          onClick={() => setSubTab('shader')}
          className={`px-2 py-0.5 rounded-xs cursor-pointer transition-all ${
            subTab === 'shader'
              ? 'bg-[#18181b] text-[#00ffff] font-bold border border-[#00ffff]/40'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          SHADER FX
        </button>
        <button
          onClick={() => setSubTab('ai')}
          className={`px-2 py-0.5 rounded-xs cursor-pointer flex items-center gap-1 transition-all ${
            subTab === 'ai'
              ? 'bg-[#18181b] text-[#00ffff] font-bold border border-[#00ffff]/40'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>AI TOOLS</span>
          <span className="text-[9px] text-[#00ffff]">›</span>
        </button>
      </div>

      {/* ─── 4. Scrollable Hardware Properties Body ─── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB: VIDEO or BASIC */}
        {mainTab === 'video' && (
          <>
            {/* Transform Hardware Unit */}
            <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-3 space-y-3 panel-recessed relative">
              {/* Screws */}
              <div className="absolute top-1.5 left-1.5 rack-screw" />
              <div className="absolute top-1.5 right-1.5 rack-screw" />

              <div className="flex items-center justify-between border-b border-[#27272a] pb-2 pl-3 pr-3">
                <div className="flex items-center gap-2">
                  {/* Heavy-duty Tactile Rocker Switch */}
                  <button
                    onClick={() => setTransformEnabled(!transformEnabled)}
                    className={`w-7 h-3.5 rounded-xs transition-all relative cursor-pointer border ${
                      transformEnabled
                        ? 'bg-[#00ffff]/20 border-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.4)]'
                        : 'bg-[#18181b] border-zinc-700'
                    }`}
                    title="Toggle Transform Hardware Module"
                  >
                    <span
                      className={`block w-2.5 h-2.5 rounded-xs transition-transform ${
                        transformEnabled ? 'translate-x-3.5 bg-[#00ffff]' : 'translate-x-0.5 bg-zinc-500'
                      }`}
                    />
                  </button>
                  <span className="font-sans font-bold text-white text-[11px] tracking-wide uppercase">
                    Transform
                  </span>
                </div>
                <button
                  onClick={handleResetTransform}
                  className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 hover:text-[#00ffff] cursor-pointer transition-colors"
                  title="Reset Transform Values"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>RESET</span>
                </button>
              </div>

              {transformEnabled && (
                <div className="space-y-3 text-[10px] px-1">
                  {/* Scale X & Y with Linking */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-zinc-400 font-sans uppercase tracking-wider text-[10px]">
                      <span>Scale Geometry</span>
                      <button
                        onClick={() => setIsScaleLinked(!isScaleLinked)}
                        className={`flex items-center gap-1 text-[9px] font-mono cursor-pointer transition-colors ${
                          isScaleLinked ? 'text-[#00ffff]' : 'text-zinc-600'
                        }`}
                        title={isScaleLinked ? 'Proportions Linked' : 'Proportions Free'}
                      >
                        {isScaleLinked ? (
                          <>
                            <Link2 className="w-2.5 h-2.5" />
                            <span>LINKED</span>
                          </>
                        ) : (
                          <>
                            <Unlink className="w-2.5 h-2.5" />
                            <span>FREE</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-[#050505] border border-[#27272a] rounded-xs px-2 py-1">
                        <span className="text-zinc-500 font-bold font-mono">X</span>
                        <input
                          type="number"
                          value={scaleX}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setScaleX(val);
                            if (isScaleLinked) setScaleY(val);
                          }}
                          className="w-full bg-transparent text-right text-[#00ffff] font-mono font-bold focus:outline-none"
                        />
                        <span className="text-zinc-600 font-mono">%</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#050505] border border-[#27272a] rounded-xs px-2 py-1">
                        <span className="text-zinc-500 font-bold font-mono">Y</span>
                        <input
                          type="number"
                          value={scaleY}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setScaleY(val);
                            if (isScaleLinked) setScaleX(val);
                          }}
                          className="w-full bg-transparent text-right text-[#00ffff] font-mono font-bold focus:outline-none"
                        />
                        <span className="text-zinc-600 font-mono">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Position X & Y */}
                  <div className="space-y-1.5">
                    <span className="text-zinc-400 font-sans uppercase tracking-wider text-[10px] block">
                      Position Offset
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-[#050505] border border-[#27272a] rounded-xs px-2 py-1">
                        <span className="text-zinc-500 font-bold font-mono">X</span>
                        <input
                          type="number"
                          value={posX}
                          onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-right text-zinc-200 font-mono focus:outline-none"
                        />
                        <span className="text-zinc-600 font-mono">px</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#050505] border border-[#27272a] rounded-xs px-2 py-1">
                        <span className="text-zinc-500 font-bold font-mono">Y</span>
                        <input
                          type="number"
                          value={posY}
                          onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-right text-zinc-200 font-mono focus:outline-none"
                        />
                        <span className="text-zinc-600 font-mono">px</span>
                      </div>
                    </div>
                  </div>

                  {/* Rotate Angle Dial & Flip Hardware Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1a1a1f]">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-sans uppercase tracking-wider text-[10px]">
                        Rotation
                      </span>
                      <div className="flex items-center gap-1 bg-[#050505] border border-[#27272a] rounded-xs px-2 py-1">
                        <input
                          type="number"
                          value={rotationAngle}
                          onChange={(e) => setRotationAngle(parseFloat(e.target.value) || 0)}
                          className="w-10 bg-transparent text-right text-[#00ffff] font-mono font-bold focus:outline-none"
                        />
                        <span className="text-zinc-600 font-mono">°</span>
                      </div>
                    </div>

                    {/* Flip Horizontal / Vertical Hardware Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="p-1.5 bg-[#050505] hover:bg-[#18181b] border border-[#27272a] hover:border-[#00ffff]/40 rounded-xs text-zinc-300 hover:text-white cursor-pointer transition-colors shadow-xs"
                        title="Flip Horizontal"
                      >
                        <FlipHorizontal className="w-3 h-3 text-zinc-400 hover:text-[#00ffff]" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 bg-[#050505] hover:bg-[#18181b] border border-[#27272a] hover:border-[#00ffff]/40 rounded-xs text-zinc-300 hover:text-white cursor-pointer transition-colors shadow-xs"
                        title="Flip Vertical"
                      >
                        <FlipVertical className="w-3 h-3 text-zinc-400 hover:text-[#00ffff]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compositing / Blending Hardware Module */}
            <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-3 space-y-3 panel-recessed relative">
              <div className="absolute top-1.5 left-1.5 rack-screw" />
              <div className="absolute top-1.5 right-1.5 rack-screw" />

              <div className="flex items-center justify-between border-b border-[#27272a] pb-2 pl-3 pr-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompositingEnabled(!compositingEnabled)}
                    className={`w-7 h-3.5 rounded-xs transition-all relative cursor-pointer border ${
                      compositingEnabled
                        ? 'bg-[#00ffff]/20 border-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.4)]'
                        : 'bg-[#18181b] border-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-2.5 h-2.5 rounded-xs transition-transform ${
                        compositingEnabled ? 'translate-x-3.5 bg-[#00ffff]' : 'translate-x-0.5 bg-zinc-500'
                      }`}
                    />
                  </button>
                  <span className="font-sans font-bold text-white text-[11px] tracking-wide uppercase">
                    Compositing & Blend
                  </span>
                </div>
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
              </div>

              {compositingEnabled && (
                <div className="space-y-3 text-[10px] px-1">
                  <div className="flex justify-between items-center text-zinc-400 font-sans uppercase tracking-wider text-[10px]">
                    <span>Blend Mode</span>
                    <select
                      value={blendMode}
                      onChange={(e) => setBlendMode(e.target.value as any)}
                      className="bg-[#050505] border border-[#27272a] text-[#00ffff] font-mono font-bold rounded-xs px-2 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="normal">Normal</option>
                      <option value="screen">Screen (Additive Glow)</option>
                      <option value="add">Linear Add</option>
                      <option value="multiply">Multiply (Shadow)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400 font-sans uppercase tracking-wider text-[10px]">
                      <span>Master Opacity</span>
                      <span className="text-[#00ffff] font-mono font-bold">{opacity}%</span>
                    </div>
                    <div className="relative pt-0.5">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={opacity}
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#18181b] rounded-sm appearance-none cursor-pointer accent-[#00ffff] relative z-10"
                      />
                      <div className="w-full h-1 mt-1 tick-marks-calibrated opacity-60" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Core Shader Calibration Dials */}
            <ShaderTuning />
          </>
        )}

        {/* TAB: TEXT / KINETIC LYRICS */}
        {mainTab === 'text' && (
          <div className="space-y-3">
            <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-3 space-y-3 panel-recessed relative">
              <div className="absolute top-1.5 left-1.5 rack-screw" />
              <div className="absolute top-1.5 right-1.5 rack-screw" />

              <div className="flex items-center justify-between border-b border-[#27272a] pb-2 pl-3 pr-3">
                <span className="font-sans font-bold text-white text-[11px] tracking-wide uppercase">
                  Kinetic Typography Engine
                </span>
                <span className="text-[9px] font-mono text-[#00ffff] font-bold bg-[#00ffff]/10 px-1.5 py-0.5 rounded border border-[#00ffff]/30">
                  WHISPER AI
                </span>
              </div>

              {/* Transcribe Action Button */}
              <button
                onClick={handleAutoTranscribeInternal}
                disabled={isTranscribing || !selectedTrack}
                className={`w-full py-2.5 border font-mono font-bold text-xs rounded-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                  selectedTrack?.has_lyrics
                    ? 'bg-[#10241b] hover:bg-[#163326] border-emerald-500/50 text-emerald-300'
                    : 'bg-[#1c1328] hover:bg-[#2a1d3d] border-fuchsia-500/50 text-fuchsia-300 hover:text-white'
                }`}
              >
                {selectedTrack?.has_lyrics ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-fuchsia-400" />
                )}
                <span>
                  {isTranscribing
                    ? 'TRANSCRIBING VOCALS (WHISPER)...'
                    : selectedTrack?.has_lyrics
                    ? 'VOCALS TRANSCRIBED (RE-RUN)'
                    : 'AUTO-TRANSCRIBE VOCALS'}
                </span>
              </button>

              {transcriptionStatus && (
                <div className="p-2 rounded bg-[#050505] border border-[#00ffff]/40 text-[10px] text-[#00ffff] font-mono leading-tight animate-pulse">
                  {transcriptionStatus}
                </div>
              )}

              {/* Synchronized Word Pills */}
              {activeLyrics && activeLyrics.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span className="font-sans font-bold text-zinc-300 uppercase">Synchronized Events</span>
                    <span className="text-emerald-400 font-bold">{activeLyrics.length} Word Markers</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-2 bg-[#050505] rounded-xs border border-[#27272a]">
                    {activeLyrics.map((w, idx) => {
                      const isCurrent = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-mono transition-all border ${
                            isCurrent
                              ? 'bg-[#00ffff] text-black font-bold border-[#00ffff] shadow-[0_0_8px_#00ffff]'
                              : 'bg-[#111114] text-zinc-300 border-[#27272a] hover:border-[#00ffff]/50 hover:text-white'
                          }`}
                          title={`${w.word} (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#050505] border border-dashed border-[#27272a] rounded-xs text-[10px] text-zinc-500 font-mono leading-relaxed">
                  No lyrics currently aligned for this track. Click "Auto-Transcribe Vocals" to run local Whisper AI.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: AUDIO / DSP */}
        {mainTab === 'audio' && (
          <div className="space-y-3">
            <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-3 space-y-3 text-[10px] panel-recessed relative">
              <div className="absolute top-1.5 left-1.5 rack-screw" />
              <div className="absolute top-1.5 right-1.5 rack-screw" />

              <div className="flex items-center justify-between border-b border-[#27272a] pb-2 pl-3 pr-3">
                <span className="font-sans font-bold text-white text-[11px] tracking-wide uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#00ffff]" />
                  Acoustic DSP Routing
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  ONLINE
                </span>
              </div>

              <div className="space-y-2 px-1 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Sampling Rate:</span>
                  <span className="text-[#00ffff] font-bold">48,000 Hz (Lossless)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Channel Config:</span>
                  <span className="text-zinc-200">2.0 Discrete Stereo</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Dynamic Range:</span>
                  <span className="text-zinc-200">24-bit PCM / 32-bit Float</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Hardware Buffer:</span>
                  <span className="text-emerald-400 font-bold">2048 Samples (5.3ms)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. Bottom Action Deck: Reset & Keyframe Panel ─── */}
      <div className="h-10 bg-[#0e0e11] border-t border-[#27272a] px-3 flex items-center justify-between shrink-0">
        <button
          onClick={handleResetTransform}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-zinc-500 rounded-xs text-[10px] font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>RESET ALL</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-1 bg-[#112233] hover:bg-[#16304a] border border-[#00ffff]/40 hover:border-[#00ffff] rounded-xs text-[10px] font-mono text-[#00ffff] font-bold transition-all shadow-xs cursor-pointer"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>KEYFRAME DECK</span>
        </button>
      </div>
    </div>
  );
};
