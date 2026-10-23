// apps/desktop/src/renderer/components/cockpit/InspectorRack/components/ShaderTuning.tsx
import React from 'react';
import { useResonanceStore } from '../../../../store/useResonanceStore.js';

export const ShaderTuning: React.FC = () => {
  const shaderParams = useResonanceStore((s) => s.shaderParams);
  const updateShaderParam = useResonanceStore((s) => s.updateShaderParam);
  const dynamicsMode = useResonanceStore((s) => s.dynamicsMode);
  const setDynamicsMode = useResonanceStore((s) => s.setDynamicsMode);

  return (
    <div className="space-y-3 border-t border-[#1c222c] pt-4">
      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Shader Calibration</h4>

      {/* Sub-Bass Extrusion */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-zinc-400">Sub-Bass Extrusion</span>
          <span className="text-[#00f0ff]">{shaderParams.bassMultiplier.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={shaderParams.bassMultiplier}
          onChange={(e) => updateShaderParam('bassMultiplier', parseFloat(e.target.value))}
          className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
        />
      </div>

      {/* Mid Glow Intensity */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-zinc-400">Mid Glow Intensity</span>
          <span className="text-[#00f0ff]">{shaderParams.midGlowIntensity.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={shaderParams.midGlowIntensity}
          onChange={(e) => updateShaderParam('midGlowIntensity', parseFloat(e.target.value))}
          className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
        />
      </div>

      {/* Treble Camera Shake */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-zinc-400">Treble Camera Shake</span>
          <span className="text-[#00f0ff]">{(shaderParams.trebleShakeIntensity * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={shaderParams.trebleShakeIntensity}
          onChange={(e) => updateShaderParam('trebleShakeIntensity', parseFloat(e.target.value))}
          className="w-full h-1 bg-[#1c222c] rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
        />
      </div>

      {/* Dynamics Mode Toggle */}
      <div className="pt-2">
        <label className="text-[10px] text-zinc-500 uppercase block mb-1.5">Dynamics Physics</label>
        <div className="grid grid-cols-3 gap-1 bg-[#10141c] p-1 rounded border border-[#1e2533] text-[10px] text-center font-bold">
          {(['ballistic', 'fluid', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDynamicsMode(mode)}
              className={`py-1 rounded uppercase transition-colors cursor-pointer ${
                dynamicsMode === mode ? 'bg-[#00f0ff] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
