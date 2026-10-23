// packages/visual-engine/src/audio/AudioTelemetry.ts
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { AudioPhysicsPipeline, TelemetryConfig, DEFAULT_TELEMETRY_CONFIG } from './physics.js';

export interface AudioTelemetryHandle {
  texture: THREE.DataTexture | null;
  pipeline: AudioPhysicsPipeline | null;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
}

/**
 * React hook to bridge an HTMLAudioElement with high-precision Web Audio FFT
 * and push physicalized telemetry (Raw, Ballistic, Peak-Hold, Fluid) into a
 * THREE.DataTexture every frame.
 */
export const useAudioTelemetry = (
  audioElement: HTMLAudioElement | null,
  config: Partial<TelemetryConfig> = {},
) => {
  const textureRef = useRef<THREE.DataTexture | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const physicsRef = useRef<AudioPhysicsPipeline | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!audioElement) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Create MediaElementSource and connect to AnalyserNode
    let source: MediaElementAudioSourceNode;
    try {
      source = audioContext.createMediaElementSource(audioElement);
    } catch {
      // In case source has already been created for this element
      return;
    }

    const analyser = audioContext.createAnalyser();
    const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    
    // High-resolution: 4096 FFT size = 2048 frequency bins (zero-zero granularity)
    analyser.fftSize = finalConfig.fftSize;
    analyser.smoothingTimeConstant = 0.0; // Raw telemetry without browser low-pass blurring

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount; // 2048 bins
    const dataArray = new Float32Array(bufferLength);
    const pipeline = new AudioPhysicsPipeline(finalConfig);

    // 1D DataTexture: width = 2048, height = 1, 4 channels (RGBA)
    const textureData = new Uint8Array(bufferLength * 4);
    const texture = new THREE.DataTexture(
      textureData,
      bufferLength,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    physicsRef.current = pipeline;
    textureRef.current = texture;
    setIsReady(true);

    let animationFrameId: number;

    const updateLoop = () => {
      if (analyserRef.current && dataArrayRef.current && physicsRef.current && textureRef.current) {
        // Extract raw decibels: float readings ranging from ~ -100dB to 0dB
        analyserRef.current.getFloatFrequencyData(dataArrayRef.current as unknown as Float32Array<ArrayBuffer>);

        // Process through Ballistic, Peak-Hold, and Fluid physics channels
        const pixelData = textureRef.current.image.data as Uint8Array;
        physicsRef.current.process(dataArrayRef.current, pixelData);

        textureRef.current.needsUpdate = true;
      }

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    updateLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioContext.close().catch(() => {});
      texture.dispose();
      setIsReady(false);
    };
  }, [audioElement]);

  return {
    textureRef,
    analyserRef,
    physicsRef,
    isReady,
  };
};

/**
 * Standalone AudioTelemetryBridge for imperative or headless Three.js loops.
 */
export class AudioTelemetryBridge {
  public audioContext: AudioContext;
  public analyser: AnalyserNode;
  public pipeline: AudioPhysicsPipeline;
  public dataArray: Float32Array;
  public texture: THREE.DataTexture;
  private animId: number | null = null;

  constructor(audioElement: HTMLAudioElement, config: Partial<TelemetryConfig> = {}) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    const source = this.audioContext.createMediaElementSource(audioElement);
    this.analyser = this.audioContext.createAnalyser();

    const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.analyser.fftSize = finalConfig.fftSize;
    this.analyser.smoothingTimeConstant = 0.0;

    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Float32Array(bufferLength);
    this.pipeline = new AudioPhysicsPipeline(finalConfig);

    const textureData = new Uint8Array(bufferLength * 4);
    this.texture = new THREE.DataTexture(
      textureData,
      bufferLength,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    this._start();
  }

  private _start(): void {
    const loop = () => {
      this.tick();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  public tick(): void {
    this.analyser.getFloatFrequencyData(this.dataArray as unknown as Float32Array<ArrayBuffer>);
    const pixelData = this.texture.image.data as Uint8Array;
    this.pipeline.process(this.dataArray, pixelData);
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    if (this.animId != null) cancelAnimationFrame(this.animId);
    this.audioContext.close().catch(() => {});
    this.texture.dispose();
  }
}
