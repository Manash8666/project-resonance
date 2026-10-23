// packages/visual-engine/src/audio/physics.ts
/**
 * Zero-Zero Mechanical Telemetry Physics Engine
 *
 * Shapes raw FFT decibel telemetry into physical mass and movement:
 * - Channel R: Instantaneous raw amplitude (0.0 to 1.0)
 * - Channel G: Ballistic smoothed amplitude (0ms attack, gravitational quadratic decay)
 * - Channel B: Peak-hold value (holds maximum, then decays with ghost trail)
 * - Channel A: Viscous fluid dispersion (neighbor-bin gaussian convolution wave)
 */

export interface TelemetryConfig {
  fftSize: number;            // Standard: 4096 (2048 bins)
  minDb: number;              // Standard: -100 dB
  maxDb: number;              // Standard: -10 dB
  gravity: number;            // Fall rate acceleration (e.g. 0.0015)
  peakHoldFrames: number;     // Number of frames to hold peak (e.g. 24 frames @ 60fps ~ 400ms)
  peakDecayRate: number;      // Decay rate for peak line once released (e.g. 0.96)
  viscosity: number;          // Fluid diffusion factor across adjacent frequency bins (0.0 to 0.5)
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  fftSize: 4096,
  minDb: -100,
  maxDb: -10,
  gravity: 0.0018,
  peakHoldFrames: 24,
  peakDecayRate: 0.95,
  viscosity: 0.25,
};

export class AudioPhysicsPipeline {
  private config: TelemetryConfig;
  private binCount: number;

  // Physics state buffers
  public rawBuffer: Float32Array;
  public ballisticBuffer: Float32Array;
  public velocityBuffer: Float32Array;
  public peakBuffer: Float32Array;
  public peakTimerBuffer: Int32Array;
  public fluidBuffer: Float32Array;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config };
    this.binCount = this.config.fftSize / 2;

    this.rawBuffer = new Float32Array(this.binCount);
    this.ballisticBuffer = new Float32Array(this.binCount);
    this.velocityBuffer = new Float32Array(this.binCount);
    this.peakBuffer = new Float32Array(this.binCount);
    this.peakTimerBuffer = new Int32Array(this.binCount);
    this.fluidBuffer = new Float32Array(this.binCount);
  }

  /**
   * Processes a new frame of raw float frequency data (in dB) and populates
   * the 4-channel texture payload (RGBA Uint8Array).
   *
   * @param rawFloatDbs - Float32Array directly from analyser.getFloatFrequencyData()
   * @param outputPixelData - Uint8Array sized (binCount * 4) for THREE.DataTexture
   */
  process(rawFloatDbs: Float32Array, outputPixelData: Uint8Array): void {
    const { minDb, maxDb, gravity, peakHoldFrames, peakDecayRate, viscosity } = this.config;
    const dbRange = maxDb - minDb;
    const count = this.binCount;

    // ── PASS 1: Normalize Raw Decibels & Apply Ballistic Gravity ──────────
    for (let i = 0; i < count; i++) {
      const db = rawFloatDbs[i];
      // Normalize raw dB into [0.0, 1.0]
      const rawNormalized = Math.max(0, Math.min(1, (db - minDb) / dbRange));
      this.rawBuffer[i] = rawNormalized;

      // Ballistic Smoothing (0ms Attack, Gravitational Fall)
      if (rawNormalized >= this.ballisticBuffer[i]) {
        // Instant mechanical attack: needle snaps to energy instantly
        this.ballisticBuffer[i] = rawNormalized;
        this.velocityBuffer[i] = 0;
      } else {
        // Gravitational decay
        this.velocityBuffer[i] += gravity;
        this.ballisticBuffer[i] = Math.max(0, this.ballisticBuffer[i] - this.velocityBuffer[i]);
      }

      // Peak-Hold with Ghost Trail
      if (rawNormalized >= this.peakBuffer[i]) {
        this.peakBuffer[i] = rawNormalized;
        this.peakTimerBuffer[i] = peakHoldFrames;
      } else {
        if (this.peakTimerBuffer[i] > 0) {
          this.peakTimerBuffer[i]--;
        } else {
          this.peakBuffer[i] = Math.max(0, this.peakBuffer[i] * peakDecayRate);
        }
      }
    }

    // ── PASS 2: Viscous Fluid Dynamics (1D Kernel Diffusion) ─────────────
    // Simulates liquid viscosity coupling between adjacent frequency harmonics
    for (let i = 0; i < count; i++) {
      const prev = i > 0 ? this.ballisticBuffer[i - 1] : this.ballisticBuffer[i];
      const curr = this.ballisticBuffer[i];
      const next = i < count - 1 ? this.ballisticBuffer[i + 1] : this.ballisticBuffer[i];

      // 3-point Laplacian diffusion: rolling fluid wave
      const diffused = curr + viscosity * (0.5 * (prev + next) - curr);
      this.fluidBuffer[i] = Math.max(0, Math.min(1, diffused));
    }

    // ── PASS 3: Pack into 4-Channel RGBA DataTexture Bytes ────────────────
    for (let i = 0; i < count; i++) {
      const offset = i * 4;
      outputPixelData[offset + 0] = Math.round(this.rawBuffer[i] * 255);       // R: Raw Telemetry
      outputPixelData[offset + 1] = Math.round(this.ballisticBuffer[i] * 255); // G: Ballistic Mechanical
      outputPixelData[offset + 2] = Math.round(this.peakBuffer[i] * 255);      // B: Ghost Peak-Hold
      outputPixelData[offset + 3] = Math.round(this.fluidBuffer[i] * 255);     // A: Viscous Fluid Wave
    }
  }

  updateConfig(newConfig: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.fftSize && newConfig.fftSize / 2 !== this.binCount) {
      this.binCount = newConfig.fftSize / 2;
      this.rawBuffer = new Float32Array(this.binCount);
      this.ballisticBuffer = new Float32Array(this.binCount);
      this.velocityBuffer = new Float32Array(this.binCount);
      this.peakBuffer = new Float32Array(this.binCount);
      this.peakTimerBuffer = new Int32Array(this.binCount);
      this.fluidBuffer = new Float32Array(this.binCount);
    }
  }
}
