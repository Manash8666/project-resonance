// packages/visual-engine/src/audio/AudioTelemetry.ts
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { AudioPhysicsPipeline, TelemetryConfig, DEFAULT_TELEMETRY_CONFIG } from './physics.js';

export interface AudioBands {
  bass: number;
  mid: number;
  treble: number;
}

export interface AudioTelemetryHandle {
  texture: THREE.DataTexture | null;
  pipeline: AudioPhysicsPipeline | null;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
}

/**
 * Dual-Layer Telemetry Hook:
 * - Micro Layer: High-resolution 2048-bin 4-channel DataTexture (Raw, Ballistic, Peak, Fluid)
 * - Macro Layer: 3 Mechanical Macro Bands (Bass ~250Hz, Mid ~4kHz, Treble ~20kHz)
 */
export const useAudioTelemetry = (
  audioElement: HTMLAudioElement | null,
  config: Partial<TelemetryConfig> = {},
) => {
  const textureRef = useRef<THREE.DataTexture | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const physicsRef = useRef<AudioPhysicsPipeline | null>(null);
  const bandsRef = useRef<AudioBands>({ bass: 0, mid: 0, treble: 0 });
  const [bands, setBands] = useState<AudioBands>({ bass: 0, mid: 0, treble: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!audioElement) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();

    let source: MediaElementAudioSourceNode;
    try {
      source = audioContext.createMediaElementSource(audioElement);
    } catch {
      return;
    }

    const analyser = audioContext.createAnalyser();
    const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };

    // Zero-zero granularity: 4096 FFT size = 2048 frequency bins
    analyser.fftSize = finalConfig.fftSize;
    analyser.smoothingTimeConstant = 0.0; // Raw unblurred telemetry

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

    // Frequency boundaries (based on ~44.1kHz / 48kHz sample rate)
    const BASS_END = 25; // ~250 Hz (Sub-bass / Kick)
    const MID_END = 400; // ~4000 Hz (Mids / Vocals / Leads)

    let animationFrameId: number;
    let frameCounter = 0;

    const updateLoop = () => {
      if (
        analyserRef.current &&
        dataArrayRef.current &&
        physicsRef.current &&
        textureRef.current
      ) {
        // 1. Extract raw decibels (-100 dB to 0 dB)
        analyserRef.current.getFloatFrequencyData(
          dataArrayRef.current as unknown as Float32Array<ArrayBuffer>,
        );

        // 2. Micro Layer: Process through physics pipeline (Raw, Ballistic, Peak, Fluid)
        const pixelData = textureRef.current.image.data as Uint8Array;
        physicsRef.current.process(dataArrayRef.current, pixelData);
        textureRef.current.needsUpdate = true;

        // 3. Macro Layer: Calculate RMS energy for the 3 mechanical bands
        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;

        for (let i = 0; i < bufferLength; i++) {
          const norm = physicsRef.current.ballisticBuffer[i];
          if (i < BASS_END) {
            bassSum += norm * norm;
          } else if (i < MID_END) {
            midSum += norm * norm;
          } else {
            trebleSum += norm * norm;
          }
        }

        const currentBands: AudioBands = {
          bass: Math.sqrt(bassSum / BASS_END),
          mid: Math.sqrt(midSum / (MID_END - BASS_END)),
          treble: Math.sqrt(trebleSum / (bufferLength - MID_END)),
        };

        bandsRef.current = currentBands;

        // Throttle state update to 30fps for React UI elements to avoid re-render overhead,
        // while bandsRef is updated at full 60fps for R3F frame callbacks
        frameCounter++;
        if (frameCounter % 2 === 0) {
          setBands(currentBands);
        }
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
    bands,
    bandsRef,
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
  public bands: AudioBands = { bass: 0, mid: 0, treble: 0 };
  private animId: number | null = null;

  constructor(audioElement: HTMLAudioElement, config: Partial<TelemetryConfig> = {}) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    this.analyser.getFloatFrequencyData(
      this.dataArray as unknown as Float32Array<ArrayBuffer>,
    );
    const pixelData = this.texture.image.data as Uint8Array;
    this.pipeline.process(this.dataArray, pixelData);
    this.texture.needsUpdate = true;

    // Calculate Macro Bands
    const BASS_END = 25;
    const MID_END = 400;
    const bufferLength = this.dataArray.length;
    let bSum = 0, mSum = 0, tSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      const norm = this.pipeline.ballisticBuffer[i];
      if (i < BASS_END) bSum += norm * norm;
      else if (i < MID_END) mSum += norm * norm;
      else tSum += norm * norm;
    }

    this.bands = {
      bass: Math.sqrt(bSum / BASS_END),
      mid: Math.sqrt(mSum / (MID_END - BASS_END)),
      treble: Math.sqrt(tSum / (bufferLength - MID_END)),
    };
  }

  public dispose(): void {
    if (this.animId != null) cancelAnimationFrame(this.animId);
    this.audioContext.close().catch(() => {});
    this.texture.dispose();
  }
}
