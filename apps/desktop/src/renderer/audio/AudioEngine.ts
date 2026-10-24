// apps/desktop/src/renderer/audio/AudioEngine.ts
import * as THREE from 'three';
import {
  AudioPhysicsPipeline,
  TelemetryConfig,
  DEFAULT_TELEMETRY_CONFIG,
  AudioBands,
} from 'visual-engine';
import { useResonanceStore } from '../store/useResonanceStore.js';

/**
 * Singleton Mechanical Audio Engine.
 * Manages the single AudioContext, Web Audio node routing, 2048-bin FFT analysis,
 * physics telemetry pipelines, and synchronization with the Zustand store.
 */
export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  // Telemetry & Physics
  private physicsPipeline: AudioPhysicsPipeline;
  private frequencyData: Float32Array;
  private dataTexture: THREE.DataTexture;
  private textureData: Uint8Array;
  private animationFrameId: number | null = null;
  private isInitialized: boolean = false;

  private currentBands: AudioBands = { bass: 0, mid: 0, treble: 0 };

  private constructor(config: Partial<TelemetryConfig> = {}) {
    const finalConfig = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.physicsPipeline = new AudioPhysicsPipeline(finalConfig);

    // 1. Create native audio element
    this.audioElement = new Audio();

    // 2. Prepare 2048-bin frequency arrays
    const bufferLength = finalConfig.fftSize / 2; // 2048 bins
    this.frequencyData = new Float32Array(bufferLength);
    this.textureData = new Uint8Array(bufferLength * 4);

    // 3. Create 1D RGBA DataTexture for GPU vertex shader
    this.dataTexture = new THREE.DataTexture(
      this.textureData,
      bufferLength,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    this.dataTexture.minFilter = THREE.LinearFilter;
    this.dataTexture.magFilter = THREE.LinearFilter;
    this.dataTexture.generateMipmaps = false;
    this.dataTexture.needsUpdate = true;

    // Attach event listeners
    this.audioElement.addEventListener('timeupdate', () => {
      const isScrubbing = useResonanceStore.getState().isScrubbing;
      if (!isScrubbing) {
        useResonanceStore.getState().setCurrentTime(this.audioElement.currentTime);
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      useResonanceStore.getState().setDuration(this.audioElement.duration);
    });

    this.audioElement.addEventListener('ended', () => {
      const state = useResonanceStore.getState();
      state.setIsPlaying(false);
      const { tracks, selectedTrackId } = state;
      if (tracks.length > 0 && selectedTrackId !== null) {
        const currentIndex = tracks.findIndex((t) => t.id === selectedTrackId);
        if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
          const nextTrack = tracks[currentIndex + 1];
          state.setSelectedTrackId(nextTrack.id);
          state.setSelectedTrack(nextTrack);
          void this.loadTrack(nextTrack.file_path).then(() => {
            void this.play();
          });
        }
      }
    });
  }

  public static getInstance(config?: Partial<TelemetryConfig>): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine(config);
    }
    return AudioEngine.instance;
  }

  /**
   * Initializes the Web Audio graph on first user interaction.
   * Browsers/Electron require user interaction to unlock the AudioContext.
   */
  public async ensureAudioContext(): Promise<void> {
    if (this.isInitialized) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.audioContext = new AudioContextClass();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = DEFAULT_TELEMETRY_CONFIG.fftSize; // 4096
    this.analyserNode.smoothingTimeConstant = 0.0; // Raw instantaneous telemetry

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = useResonanceStore.getState().volume;

    // Connect: audioElement -> sourceNode -> analyser -> gain -> speakers
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.isInitialized = true;
    this.startTelemetryLoop();
  }

  /**
   * Loads a track by file path using the strictly formatted file:/// protocol.
   */
  public async loadTrack(filePath: string): Promise<void> {
    let fileUrl: string;
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:') || filePath.startsWith('blob:')) {
      fileUrl = filePath;
    } else {
      // 1. Convert Windows backslashes to forward slashes
      const formattedPath = filePath.replace(/\\/g, '/');
      
      // 2. Construct a valid file:/// URL (Three slashes for drive letters e.g. file:///E:/...)
      fileUrl = formattedPath.startsWith('/')
        ? `file://${formattedPath}`
        : `file:///${formattedPath}`;
    }

    console.log("Loading Audio Source:", fileUrl); // Diagnostic log
    
    this.audioElement.src = fileUrl;
    this.audioElement.load();
    
    // Wait for metadata to ensure the file is actually readable
    await new Promise<void>((resolve, reject) => {
      this.audioElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
      this.audioElement.addEventListener('error', (e) => {
        console.error("Audio element error on URL:", fileUrl, e);
        reject(new Error("Media element error"));
      }, { once: true });
    });
  }

  /**
   * Starts playback and synchronizes state.
   */
  public async play(): Promise<void> {
    await this.ensureAudioContext();
    try {
      await this.audioElement.play();
      useResonanceStore.getState().setIsPlaying(true);
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  }

  /**
   * Pauses playback.
   */
  public pause(): void {
    this.audioElement.pause();
    useResonanceStore.getState().setIsPlaying(false);
  }

  /**
   * Toggles playback state.
   */
  public async toggle(): Promise<void> {
    if (this.audioElement.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  /**
   * Seeks audio element to exact timestamp in seconds.
   */
  public seek(timeInSeconds: number): void {
    this.audioElement.currentTime = timeInSeconds;
    useResonanceStore.getState().setCurrentTime(timeInSeconds);
  }

  /**
   * Updates master gain node and audio element volume.
   */
  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.audioElement.volume = clamped;
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
    useResonanceStore.getState().setVolume(clamped);
  }

  /**
   * Dedicated 60 FPS Telemetry RAF loop:
   * Extracts raw frequency data, drives multi-channel physics,
   * uploads to GPU DataTexture, and publishes Macro Bands to Zustand.
   */
  private startTelemetryLoop(): void {
    if (this.animationFrameId !== null) return;

    const BASS_END = 25;  // ~250 Hz (Sub-bass)
    const MID_END = 400;  // ~4000 Hz (Mids / Vocals)
    const binCount = this.frequencyData.length;

    const tick = () => {
      if (this.analyserNode && this.isInitialized) {
        // 1. Extract raw decibels (-100 dB to 0 dB)
        this.analyserNode.getFloatFrequencyData(this.frequencyData as any);

        // 2. Process physics pipeline (Micro Layer: Raw, Ballistic, Peak, Fluid)
        this.physicsPipeline.process(this.frequencyData, this.textureData);
        this.dataTexture.needsUpdate = true;

        // 3. Calculate Macro Bands (RMS)
        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;

        for (let i = 0; i < BASS_END; i++) {
          const norm = Math.max(0, (this.frequencyData[i] + 100) / 100);
          bassSum += norm * norm;
        }
        for (let i = BASS_END; i < MID_END; i++) {
          const norm = Math.max(0, (this.frequencyData[i] + 100) / 100);
          midSum += norm * norm;
        }
        for (let i = MID_END; i < binCount; i++) {
          const norm = Math.max(0, (this.frequencyData[i] + 100) / 100);
          trebleSum += norm * norm;
        }

        const bassRMS = Math.sqrt(bassSum / BASS_END);
        const midRMS = Math.sqrt(midSum / (MID_END - BASS_END));
        const trebleRMS = Math.sqrt(trebleSum / (binCount - MID_END));

        this.currentBands = {
          bass: bassRMS,
          mid: midRMS,
          treble: trebleRMS,
        };

        // Push macro bands to store
        useResonanceStore.getState().setMacroBands(this.currentBands);
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public getAudioElement(): HTMLAudioElement {
    return this.audioElement;
  }

  public getDataTexture(): THREE.DataTexture {
    return this.dataTexture;
  }

  public getMacroBands(): AudioBands {
    return this.currentBands;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.audioElement.pause();
    this.audioElement.src = '';
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
