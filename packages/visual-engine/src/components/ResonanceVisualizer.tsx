// packages/visual-engine/src/components/ResonanceVisualizer.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAudioTelemetry } from '../audio/AudioTelemetry.js';
import { equalizerVertexShader, equalizerFragmentShader } from '../shaders/equalizer.glsl.js';
import type { TelemetryConfig } from '../audio/physics.js';

export type DynamicsMode = 'ballistic' | 'fluid' | 'hybrid';

export interface ResonanceVisualizerProps {
  audioElement: HTMLAudioElement | null;
  dynamicsMode?: DynamicsMode;
  baseColor?: [number, number, number];
  glowColor?: [number, number, number];
  peakColor?: [number, number, number];
  sensitivity?: number;
  physicsConfig?: Partial<TelemetryConfig>;
  className?: string;
}

export const ResonanceVisualizer: React.FC<ResonanceVisualizerProps> = ({
  audioElement,
  dynamicsMode = 'ballistic',
  baseColor = [0.03, 0.04, 0.05],
  glowColor = [0.0, 0.94, 1.0],      // Neon cyan
  peakColor = [1.0, 0.65, 0.0],      // Industrial amber
  sensitivity = 1.0,
  physicsConfig,
  className = 'w-full h-full',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { textureRef, isReady } = useAudioTelemetry(audioElement, physicsConfig);
  const [mode, setMode] = useState<DynamicsMode>(dynamicsMode);

  // Sync mode with props
  useEffect(() => {
    setMode(dynamicsMode);
  }, [dynamicsMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Setup Three.js Scene, Camera, Renderer ─────────────────────────
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Placeholder 1x1 black texture until audio texture arrives
    const dummyTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    dummyTexture.needsUpdate = true;

    // Convert string mode to shader integer
    const getModeInt = (m: DynamicsMode) => (m === 'ballistic' ? 0 : m === 'fluid' ? 1 : 2);

    const uniforms = {
      u_audioTexture: { value: textureRef.current || dummyTexture },
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_dynamicsMode: { value: getModeInt(mode) },
      u_baseColor: { value: new THREE.Vector3(...baseColor) },
      u_glowColor: { value: new THREE.Vector3(...glowColor) },
      u_peakColor: { value: new THREE.Vector3(...peakColor) },
      u_sensitivity: { value: sensitivity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: equalizerVertexShader,
      fragmentShader: equalizerFragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Animation Loop ────────────────────────────────────────────────
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      uniforms.u_time.value = clock.getElapsedTime();
      if (textureRef.current) {
        uniforms.u_audioTexture.value = textureRef.current;
      }
      uniforms.u_dynamicsMode.value = getModeInt(mode);
      uniforms.u_sensitivity.value = sensitivity;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    // ── Resize Observer ───────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          renderer.setSize(newW, newH);
          uniforms.u_resolution.value.set(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      dummyTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [baseColor, glowColor, peakColor, sensitivity, mode, isReady]);

  return (
    <div className={`relative ${className} bg-[#08090a] overflow-hidden rounded-lg border border-[#1c222c]`}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Dynamics Mode Selector Overlay HUD */}
      <div className="absolute top-3 right-3 flex items-center space-x-1 bg-[#0b0e14]/80 backdrop-blur-xs border border-[#232b3b] p-1 rounded-md z-10 text-[10px] font-mono">
        <button
          onClick={() => setMode('ballistic')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mode === 'ballistic'
              ? 'bg-[#00f0ff] text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          PATH A: BALLISTIC
        </button>
        <button
          onClick={() => setMode('fluid')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mode === 'fluid'
              ? 'bg-[#00f0ff] text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          PATH B: FLUID
        </button>
        <button
          onClick={() => setMode('hybrid')}
          className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
            mode === 'hybrid'
              ? 'bg-[#00f0ff] text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          HYBRID MATRIX
        </button>
      </div>

      {/* Telemetry Status Indicator */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-[#0b0e14]/80 backdrop-blur-xs border border-[#232b3b] px-2.5 py-1 rounded text-[10px] font-mono text-zinc-400">
        <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span>FFT: 4096 BINS (2048 RES) // 60 FPS</span>
      </div>
    </div>
  );
};
