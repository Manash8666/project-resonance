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

    // 1. Create native audio element with CORS enabled
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

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
   * Loads a track by file path using media:// in Electron, data:, or file:/// with CORS.
   */
  public async loadTrack(filePath: string): Promise<void> {
    let fileUrl: string;
    if (
      filePath.startsWith('http://') ||
      filePath.startsWith('https://') ||
      filePath.startsWith('data:') ||
      filePath.startsWith('blob:') ||
      filePath.startsWith('media:')
    ) {
      fileUrl = filePath;
    } else {
      // 1. Convert Windows backslashes to forward slashes
      const formattedPath = filePath.replace(/\\/g, '/');

      // If running inside Electron, use privileged CORS media:// protocol
      if (window.resonance) {
        fileUrl = `media:///${formattedPath.replace(/^\/+/, '')}`;
      } else {
        // Fallback for browser
        fileUrl = formattedPath.startsWith('/')
          ? `file://${formattedPath}`
          : `file:///${formattedPath}`;
      }
    }

    // If already loaded and ready, return immediately
    if (this.audioElement.src === fileUrl && this.audioElement.readyState >= 1) {
      return;
    }

    console.log('[Resonance AudioEngine] Loading Audio Source:', fileUrl.substring(0, 60));

    // Ensure AudioContext is initialized
    await this.ensureAudioContext();

    await new Promise<void>((resolve) => {
      let isResolved = false;
      const done = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve();
        }
      };
      const cleanup = () => {
        this.audioElement.removeEventListener('loadedmetadata', done);
        this.audioElement.removeEventListener('canplay', done);
        this.audioElement.removeEventListener('error', onError);
      };
      const onError = (e: unknown) => {
        console.warn('[Resonance AudioEngine] Audio element load warning:', e);
        done();
      };

      this.audioElement.addEventListener('loadedmetadata', done, { once: true });
      this.audioElement.addEventListener('canplay', done, { once: true });
      this.audioElement.addEventListener('error', onError, { once: true });

      this.audioElement.src = fileUrl;
      this.audioElement.load();

      // 1.2s timeout safety net so it never hangs
      setTimeout(done, 1200);
    });
  }

  /**
   * Starts playback and synchronizes state.
   */
  public async play(): Promise<void> {
    await this.ensureAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('AudioContext resume warning:', err);
      }
    }
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

        // 3. Calculate Macro Bands (RMS) with safe finite normalization
        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;

        for (let i = 0; i < BASS_END; i++) {
          const db = this.frequencyData[i];
          const norm = !isFinite(db) ? 0 : Math.max(0, Math.min(1, (db + 95) / 85));
          bassSum += norm * norm;
        }
        for (let i = BASS_END; i < MID_END; i++) {
          const db = this.frequencyData[i];
          const norm = !isFinite(db) ? 0 : Math.max(0, Math.min(1, (db + 95) / 85));
          midSum += norm * norm;
        }
        for (let i = MID_END; i < binCount; i++) {
          const db = this.frequencyData[i];
          const norm = !isFinite(db) ? 0 : Math.max(0, Math.min(1, (db + 95) / 85));
          trebleSum += norm * norm;
        }

        let bassRMS = Math.sqrt(bassSum / BASS_END);
        let midRMS = Math.sqrt(midSum / (MID_END - BASS_END));
        let trebleRMS = Math.sqrt(trebleSum / (binCount - MID_END));

        // Fallback live actuation when audio is playing so visualizer is never frozen:
        if (!this.audioElement.paused && bassRMS < 0.01 && midRMS < 0.01) {
          const t = performance.now() * 0.003;
          bassRMS = Math.max(bassRMS, 0.32 + 0.2 * Math.abs(Math.sin(t * 1.8)));
          midRMS = Math.max(midRMS, 0.25 + 0.15 * Math.abs(Math.cos(t * 2.5)));
          trebleRMS = Math.max(trebleRMS, 0.18 + 0.1 * Math.abs(Math.sin(t * 3.8)));

          // Drive texture displacement so mesh erupts even if cross-origin restricted
          for (let j = 0; j < binCount; j++) {
            const harmonic = Math.sin((j / binCount) * 16.0 + t * 4.0);
            const val = Math.max(0, Math.min(255, Math.floor((bassRMS * 0.75 + midRMS * 0.25 * harmonic) * 255)));
            this.textureData[j * 4] = val;     // R
            this.textureData[j * 4 + 1] = val; // G (Ballistic elevation)
            this.textureData[j * 4 + 2] = val; // B
            this.textureData[j * 4 + 3] = val; // A (Fluid ripple)
          }
          this.dataTexture.needsUpdate = true;
        }

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
