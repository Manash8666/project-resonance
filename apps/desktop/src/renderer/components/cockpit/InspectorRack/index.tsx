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

  const [mainTab, setMainTab] = useState<'text' | 'video' | 'audio'>('video'); // Filmora default: Video
  const [subTab, setSubTab] = useState<'basic' | 'mask' | 'ai'>('basic'); // Filmora sub-tab

  // Filmora-style Transform State
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
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0e] border-l border-[#1a2230] font-mono select-none overflow-hidden text-xs">
      {/* ─── 1. Main Navigation Ribbon Tabs (Text, Video, Audio) ─── */}
      <div className="h-8 bg-[#0b0e14] border-b border-[#1a2230] flex items-center px-2 gap-1 shrink-0 text-[11px]">
        <button
          onClick={() => setMainTab('video')}
          className={`px-3 py-1 rounded-t-sm uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'video'
              ? 'bg-[#14233a] text-[#00f0ff] border-b-2 border-b-[#00f0ff]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Video className="w-3 h-3" />
          <span>Video</span>
        </button>

        <button
          onClick={() => setMainTab('text')}
          className={`px-3 py-1 rounded-t-sm uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'text'
              ? 'bg-[#14233a] text-[#00f0ff] border-b-2 border-b-[#00f0ff]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Type className="w-3 h-3" />
          <span>Text</span>
        </button>

        <button
          onClick={() => setMainTab('audio')}
          className={`px-3 py-1 rounded-t-sm uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            mainTab === 'audio'
              ? 'bg-[#14233a] text-[#00f0ff] border-b-2 border-b-[#00f0ff]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Volume2 className="w-3 h-3" />
          <span>Audio</span>
        </button>
      </div>

      {/* ─── 2. Sub-Category Tabs (Basic, Mask / Shader, AI Tools) ─── */}
      <div className="h-7 bg-[#080b10] border-b border-[#161d28] flex items-center px-3 gap-2 shrink-0 text-[10px]">
        <button
          onClick={() => setSubTab('basic')}
          className={`px-2 py-0.5 rounded cursor-pointer ${
            subTab === 'basic' ? 'bg-[#182638] text-[#00f0ff] font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setSubTab('mask')}
          className={`px-2 py-0.5 rounded cursor-pointer ${
            subTab === 'mask' ? 'bg-[#182638] text-[#00f0ff] font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Shader FX
        </button>
        <button
          onClick={() => setSubTab('ai')}
          className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 ${
            subTab === 'ai' ? 'bg-[#182638] text-[#00f0ff] font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>AI Tools</span>
          <span className="text-[9px] text-[#00f0ff]">›</span>
        </button>
      </div>

      {/* ─── 3. Scrollable Properties Body ─── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB: VIDEO or BASIC */}
        {mainTab === 'video' && (
          <>
            {/* Transform Section Accordion */}
            <div className="bg-[#0b0e14] border border-[#1a2230] rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#161c28] pb-1.5">
                <div className="flex items-center gap-2">
                  {/* Green/Cyan Active Toggle Switch */}
                  <button
                    onClick={() => setTransformEnabled(!transformEnabled)}
                    className={`w-7 h-3.5 rounded-full transition-colors relative cursor-pointer ${
                      transformEnabled ? 'bg-[#00f0ff]' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-2.5 h-2.5 rounded-full bg-black transition-transform ${
                        transformEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-white text-[11px]">Transform</span>
                </div>
                <button
                  onClick={handleResetTransform}
                  className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-[#00f0ff] cursor-pointer transition-colors"
                  title="Reset Transform Values"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>

              {transformEnabled && (
                <div className="space-y-2.5 text-[10px]">
                  {/* Scale X & Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Scale</span>
                      <button
                        onClick={() => setIsScaleLinked(!isScaleLinked)}
                        className={`flex items-center gap-1 text-[9px] cursor-pointer transition-colors ${
                          isScaleLinked ? 'text-[#00f0ff]' : 'text-zinc-600'
                        }`}
                        title={isScaleLinked ? 'Proportions Linked' : 'Proportions Free'}
                      >
                        {isScaleLinked ? (
                          <>
                            <Link2 className="w-2.5 h-2.5" />
                            <span>Linked</span>
                          </>
                        ) : (
                          <>
                            <Unlink className="w-2.5 h-2.5" />
                            <span>Unlinked</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-[#0e131b] border border-[#1e2736] rounded px-2 py-1">
                        <span className="text-zinc-500 font-bold">X</span>
                        <input
                          type="number"
                          value={scaleX}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setScaleX(val);
                            if (isScaleLinked) setScaleY(val);
                          }}
                          className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                        />
                        <span className="text-zinc-500">%</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#0e131b] border border-[#1e2736] rounded px-2 py-1">
                        <span className="text-zinc-500 font-bold">Y</span>
                        <input
                          type="number"
                          value={scaleY}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setScaleY(val);
                            if (isScaleLinked) setScaleX(val);
                          }}
                          className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                        />
                        <span className="text-zinc-500">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Position X & Y */}
                  <div className="space-y-1">
                    <span className="text-zinc-400">Position</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-[#0e131b] border border-[#1e2736] rounded px-2 py-1">
                        <span className="text-zinc-500 font-bold">X</span>
                        <input
                          type="number"
                          value={posX}
                          onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                        />
                        <span className="text-zinc-500">px</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#0e131b] border border-[#1e2736] rounded px-2 py-1">
                        <span className="text-zinc-500 font-bold">Y</span>
                        <input
                          type="number"
                          value={posY}
                          onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-right text-zinc-200 focus:outline-none"
                        />
                        <span className="text-zinc-500">px</span>
                      </div>
                    </div>
                  </div>

                  {/* Rotate Angle Dial & Flip Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Rotate</span>
                      <div className="flex items-center gap-1 bg-[#0e131b] border border-[#1e2736] rounded px-2 py-1">
                        <input
                          type="number"
                          value={rotationAngle}
                          onChange={(e) => setRotationAngle(parseFloat(e.target.value) || 0)}
                          className="w-12 bg-transparent text-right text-zinc-200 focus:outline-none"
                        />
                        <span className="text-zinc-500">°</span>
                      </div>
                    </div>

                    {/* Flip Horizontal / Vertical Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="p-1.5 bg-[#0e131b] hover:bg-[#161e2b] border border-[#1e2736] rounded text-zinc-300 hover:text-white cursor-pointer transition-colors"
                        title="Flip Horizontal"
                      >
                        <FlipHorizontal className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 bg-[#0e131b] hover:bg-[#161e2b] border border-[#1e2736] rounded text-zinc-300 hover:text-white cursor-pointer transition-colors"
                        title="Flip Vertical"
                      >
                        <FlipVertical className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compositing / Blending Section */}
            <div className="bg-[#0b0e14] border border-[#1a2230] rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#161c28] pb-1.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompositingEnabled(!compositingEnabled)}
                    className={`w-7 h-3.5 rounded-full transition-colors relative cursor-pointer ${
                      compositingEnabled ? 'bg-[#00f0ff]' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-2.5 h-2.5 rounded-full bg-black transition-transform ${
                        compositingEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-white text-[11px]">Compositing</span>
                </div>
              </div>

              {compositingEnabled && (
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Blend Mode</span>
                    <select
                      value={blendMode}
                      onChange={(e) => setBlendMode(e.target.value as any)}
                      className="bg-[#0e131b] border border-[#1e2736] text-[#00f0ff] rounded px-2 py-0.5 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="screen">Screen</option>
                      <option value="add">Linear Add</option>
                      <option value="multiply">Multiply</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Opacity</span>
                      <span className="text-[#00f0ff] font-bold">{opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
                    />
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
            <div className="bg-[#0b0e14] border border-[#1a2230] rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#161c28] pb-1.5">
                <span className="font-bold text-white text-[11px]">Kinetic Typography Engine</span>
                <span className="text-[9px] text-[#00f0ff] font-bold">WHISPER AI</span>
              </div>

              {/* Transcribe Action */}
              <button
                onClick={handleAutoTranscribeInternal}
                disabled={isTranscribing || !selectedTrack}
                className={`w-full py-2 border font-mono font-bold text-xs rounded transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedTrack?.has_lyrics
                    ? 'bg-[#121f18] hover:bg-[#1a2d24] border-emerald-500/50 text-emerald-400'
                    : 'bg-[#181326] hover:bg-[#251d3b] border-fuchsia-500/50 text-fuchsia-400 hover:text-white'
                }`}
              >
                {selectedTrack?.has_lyrics ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
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
                <div className="p-2 rounded bg-[#10141f] border border-[#00f0ff]/40 text-[10px] text-[#00f0ff] font-mono leading-tight animate-pulse">
                  {transcriptionStatus}
                </div>
              )}

              {/* Synchronized Word Pills */}
              {activeLyrics && activeLyrics.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span className="font-bold text-zinc-300">Synchronized Words</span>
                    <span className="text-emerald-400 font-bold">{activeLyrics.length} Events</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-[#07090d] rounded border border-[#18202d]">
                    {activeLyrics.map((w, idx) => {
                      const isCurrent = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border ${
                            isCurrent
                              ? 'bg-[#00f0ff] text-black font-bold border-[#00f0ff] shadow-[0_0_8px_#00f0ff]'
                              : 'bg-[#10141d] text-zinc-300 border-[#1f2736] hover:border-[#00f0ff]/50 hover:text-white'
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
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  No lyrics currently aligned for this track. Click "Auto-Transcribe Vocals" to run Whisper AI.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB: AUDIO / DSP */}
        {mainTab === 'audio' && (
          <div className="space-y-3">
            <div className="bg-[#0b0e14] border border-[#1a2230] rounded-md p-3 space-y-2.5 text-[10px]">
              <span className="font-bold text-white text-[11px] block border-b border-[#161c28] pb-1.5">
                Acoustic DSP Routing
              </span>
              <div className="flex justify-between text-zinc-400">
                <span>Sampling Rate:</span>
                <span className="text-[#00f0ff] font-bold">48,000 Hz (Lossless)</span>
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
        )}
      </div>

      {/* ─── 4. Filmora Bottom Action Buttons: Reset & Keyframe Panel ─── */}
      <div className="h-10 bg-[#090c12] border-t border-[#1a2230] px-3 flex items-center justify-between shrink-0">
        <button
          onClick={handleResetTransform}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#10141d] hover:bg-[#161d2b] border border-[#1e2736] hover:border-zinc-500 rounded text-[10px] text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-1 bg-[#14233a] hover:bg-[#1c3252] border border-[#00f0ff]/40 hover:border-[#00f0ff] rounded text-[10px] text-[#00f0ff] font-bold transition-all shadow-xs cursor-pointer"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>Keyframe Panel</span>
        </button>
      </div>
    </div>
  );
};
