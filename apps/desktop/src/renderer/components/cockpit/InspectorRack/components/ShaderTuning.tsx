// apps/desktop/src/renderer/components/cockpit/InspectorRack/components/ShaderTuning.tsx
import React from 'react';
import { useResonanceStore } from '../../../../store/useResonanceStore.js';
import { Sliders, Cpu } from 'lucide-react';

export const ShaderTuning: React.FC = () => {
  const shaderParams = useResonanceStore((s) => s.shaderParams);
  const updateShaderParam = useResonanceStore((s) => s.updateShaderParam);
  const dynamicsMode = useResonanceStore((s) => s.dynamicsMode);
  const setDynamicsMode = useResonanceStore((s) => s.setDynamicsMode);

  return (
    <div className="bg-[#09090c] border border-[#27272a] rounded-sm p-3 space-y-3.5 panel-recessed relative">
      {/* 4 Corner Hardware Screws */}
      <div className="absolute top-1.5 left-1.5 rack-screw" />
      <div className="absolute top-1.5 right-1.5 rack-screw" />
      <div className="absolute bottom-1.5 left-1.5 rack-screw" />
      <div className="absolute bottom-1.5 right-1.5 rack-screw" />

      {/* Hardware Module Header */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-2 px-1">
        <div className="flex items-center gap-1.5 pl-3">
          <Sliders className="w-3.5 h-3.5 text-[#00ffff]" />
          <span className="text-[10px] font-sans font-bold text-zinc-200 uppercase tracking-wider">
            Shader Calibration Unit
          </span>
        </div>
        <div className="flex items-center gap-1.5 pr-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ffff] animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-500 font-semibold tracking-widest">
            DSP.MOD-01
          </span>
        </div>
      </div>

      <div className="px-1 space-y-3">
        {/* 1. Sub-Bass Extrusion */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-zinc-400 font-sans text-[11px] uppercase tracking-wider">
              Sub-Bass Extrusion
            </span>
            <span className="text-[#00ffff] font-bold bg-[#00ffff]/10 px-1.5 py-0.5 rounded border border-[#00ffff]/30">
              {shaderParams.bassMultiplier.toFixed(1)}x
            </span>
          </div>
          <div className="relative pt-0.5">
            <input
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={shaderParams.bassMultiplier}
              onChange={(e) => updateShaderParam('bassMultiplier', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#18181b] rounded-sm appearance-none cursor-pointer accent-[#00ffff] relative z-10"
            />
            {/* Calibrated Tick Marks Track */}
            <div className="w-full h-1 mt-1 tick-marks-calibrated opacity-60" />
          </div>
        </div>

        {/* 2. Mid Glow Intensity */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-zinc-400 font-sans text-[11px] uppercase tracking-wider">
              Mid Glow Intensity
            </span>
            <span className="text-[#00ffff] font-bold bg-[#00ffff]/10 px-1.5 py-0.5 rounded border border-[#00ffff]/30">
              {shaderParams.midGlowIntensity.toFixed(1)}x
            </span>
          </div>
          <div className="relative pt-0.5">
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={shaderParams.midGlowIntensity}
              onChange={(e) => updateShaderParam('midGlowIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#18181b] rounded-sm appearance-none cursor-pointer accent-[#00ffff] relative z-10"
            />
            <div className="w-full h-1 mt-1 tick-marks-calibrated opacity-60" />
          </div>
        </div>

        {/* 3. Treble Camera Shake */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-zinc-400 font-sans text-[11px] uppercase tracking-wider">
              Treble Camera Shake
            </span>
            <span className="text-[#00ffff] font-bold bg-[#00ffff]/10 px-1.5 py-0.5 rounded border border-[#00ffff]/30">
              {(shaderParams.trebleShakeIntensity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="relative pt-0.5">
            <input
              type="range"
              min="0"
              max="0.2"
              step="0.01"
              value={shaderParams.trebleShakeIntensity}
              onChange={(e) => updateShaderParam('trebleShakeIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#18181b] rounded-sm appearance-none cursor-pointer accent-[#00ffff] relative z-10"
            />
            <div className="w-full h-1 mt-1 tick-marks-calibrated opacity-60" />
          </div>
        </div>

        {/* 4. Dynamics Physics 3-Way Mode Switch */}
        <div className="pt-2 border-t border-[#1c1c20]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-[#00ffff]" />
              Dynamics Physics Core
            </span>
            <span className="text-[9px] font-mono text-[#00ffff] uppercase font-bold">
              {dynamicsMode}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-[#050505] p-1 rounded border border-[#27272a] text-[10px] font-mono text-center">
            {(['ballistic', 'fluid', 'hybrid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDynamicsMode(mode)}
                className={`py-1.5 rounded uppercase font-bold transition-all cursor-pointer border ${
                  dynamicsMode === mode
                    ? 'bg-[#18181b] text-[#00ffff] border-[#00ffff]/50 shadow-[0_0_8px_rgba(0,255,255,0.25)]'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-[#111114]'
                }`}
              >
                [ {mode} ]
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
