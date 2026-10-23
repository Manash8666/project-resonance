// packages/visual-engine/src/components/VisualizerScene.tsx
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioTelemetry, AudioBands } from '../audio/AudioTelemetry.js';
import { mechanicalEQVertexShader } from '../shaders/mechanicalEQ.vert.js';
import { mechanicalEQFragmentShader } from '../shaders/mechanicalEQ.frag.js';

interface EqualizerMeshProps {
  textureRef: React.RefObject<THREE.DataTexture | null>;
  bandsRef: React.RefObject<AudioBands>;
}

// ─── 3D Equalizer Mesh with Micro Displacement & Macro Actuation ──────────────
const EqualizerMesh: React.FC<EqualizerMeshProps> = ({ textureRef, bandsRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Create a 1x1 black fallback texture
  const dummyTexture = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const uniforms = useMemo(
    () => ({
      u_audioTexture: { value: dummyTexture },
      u_bass: { value: 0 },
      u_mid: { value: 0 },
      u_treble: { value: 0 },
      u_time: { value: 0 },
      u_baseColor: { value: new THREE.Color('#10141a') },
      u_glowColor: { value: new THREE.Color('#00f0ff') }, // Neon Cyan
    }),
    [dummyTexture],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const currentBands = bandsRef.current || { bass: 0, mid: 0, treble: 0 };

    // Update Macro uniforms
    uniforms.u_bass.value = currentBands.bass;
    uniforms.u_mid.value = currentBands.mid;
    uniforms.u_treble.value = currentBands.treble;
    uniforms.u_time.value = state.clock.elapsedTime;

    // Update Micro zero-zero texture
    if (textureRef.current) {
      uniforms.u_audioTexture.value = textureRef.current;
    }

    // TREBLE ACTUATION: Micro camera shake on high-frequency transients
    const shakeIntensity = currentBands.treble * 0.055;
    camera.position.x = Math.sin(state.clock.elapsedTime * 60) * shakeIntensity;
    camera.position.y = Math.cos(state.clock.elapsedTime * 60) * shakeIntensity + 1.6;
    camera.lookAt(0, 0, 0);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.3, 0, 0]} position={[0, -0.8, 0]}>
      {/* High-segment plane for zero-zero vertex displacement (512 x 256) */}
      <planeGeometry args={[11, 6, 512, 256]} />
      <shaderMaterial
        vertexShader={mechanicalEQVertexShader}
        fragmentShader={mechanicalEQFragmentShader}
        uniforms={uniforms}
        wireframe={false}
      />
    </mesh>
  );
};

// ─── Background Album Art Quad ────────────────────────────────────────────────
const BackgroundArtQuad: React.FC<{ url: string | null }> = ({ url }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => setTexture(tex),
      undefined,
      () => setTexture(null),
    );
  }, [url]);

  if (!texture) return null;

  return (
    <mesh position={[0, 0, -4.5]}>
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial map={texture as any} transparent opacity={0.35} />
    </mesh>
  );
};

// ─── Main VisualizerScene Component ───────────────────────────────────────────
export interface VisualizerSceneProps {
  audioElement?: HTMLAudioElement | null;
  dataTexture?: THREE.DataTexture | null;
  bandsRef?: React.RefObject<AudioBands>;
  albumArtUrl?: string | null;
  className?: string;
}

export const VisualizerScene: React.FC<VisualizerSceneProps> = ({
  audioElement = null,
  dataTexture = null,
  bandsRef: externalBandsRef,
  albumArtUrl = null,
  className = 'w-full h-full',
}) => {
  // If dataTexture is provided externally, skip creating internal AudioContext
  const hasExternalTexture = Boolean(dataTexture);
  const internalTelemetry = useAudioTelemetry(hasExternalTexture ? null : audioElement);

  const fallbackTextureRef = useRef<THREE.DataTexture | null>(null);
  fallbackTextureRef.current = dataTexture;

  const textureRef = hasExternalTexture ? fallbackTextureRef : internalTelemetry.textureRef;
  const bandsRef = hasExternalTexture
    ? (externalBandsRef || internalTelemetry.bandsRef)
    : internalTelemetry.bandsRef;
  const isReady = hasExternalTexture || internalTelemetry.isReady;

  return (
    <div className={`relative ${className} bg-[#060709] overflow-hidden rounded-lg border border-[#1c222c]`}>
      <Canvas
        camera={{ position: [0, 1.6, 4.8], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#040507']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />

        {/* Background Album Art Quad */}
        <BackgroundArtQuad url={albumArtUrl} />

        {/* 3D Mechanical Mesh */}
        <EqualizerMesh textureRef={textureRef} bandsRef={bandsRef} />
      </Canvas>

      {/* Real-time Macro Bands Telemetry Readout HUD */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-[#0b0e14]/85 backdrop-blur-xs border border-[#232b3b] px-3 py-1.5 rounded text-[11px] font-mono text-zinc-300 pointer-events-none shadow-lg">
        <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <div className="flex items-center space-x-3 text-[10px]">
          <span>
            STATUS: <span className="text-[#00f0ff] font-bold">{isReady ? 'ONLINE' : 'STANDBY'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
