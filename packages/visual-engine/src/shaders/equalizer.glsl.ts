// packages/visual-engine/src/shaders/equalizer.glsl.ts

export const equalizerVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const equalizerFragmentShader = /* glsl */ `
uniform sampler2D u_audioTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform int u_dynamicsMode;   // 0 = Path A: Ballistic Peak-Hold, 1 = Path B: Viscous Fluid Wave, 2 = Hybrid Matrix
uniform vec3 u_baseColor;
uniform vec3 u_glowColor;
uniform vec3 u_peakColor;
uniform float u_sensitivity;

varying vec2 vUv;
varying vec3 vPosition;

// Samples the 4-channel telemetry texture at a given normalized frequency
vec4 sampleTelemetry(float freqNormalized) {
  // Clamp within bounds to prevent edge artifacts
  float clampedFreq = clamp(freqNormalized, 0.001, 0.999);
  return texture2D(u_audioTexture, vec2(clampedFreq, 0.5));
}

void main() {
  vec2 uv = vUv;
  
  // Logarithmic frequency scale (mimics human cochlear response from 20 Hz to 20 kHz)
  // Low frequencies (sub-bass / kick) receive wider resolution on the left
  float freq = pow(uv.x, 2.2);

  vec4 telemetry = sampleTelemetry(freq);
  float rawSample       = telemetry.r * u_sensitivity;
  float ballisticSample = telemetry.g * u_sensitivity;
  float peakHoldSample  = telemetry.b * u_sensitivity;
  float fluidSample     = telemetry.a * u_sensitivity;

  float activeLevel = 0.0;
  float peakLine    = peakHoldSample;

  if (u_dynamicsMode == 0) {
    // ── Path A: Ballistic Smoothing & Peak-Hold ──────────────────────
    activeLevel = ballisticSample;
  } else if (u_dynamicsMode == 1) {
    // ── Path B: Viscous Fluid Dynamics ──────────────────────────────
    activeLevel = fluidSample;
  } else {
    // ── Hybrid Matrix ───────────────────────────────────────────────
    activeLevel = mix(ballisticSample, fluidSample, 0.35);
  }

  // Bar / Amplitude Masking
  float barHeight = activeLevel * 0.85;
  float distFromBar = uv.y - barHeight;

  // Background chassis color with subtle scanlines
  float scanline = sin(uv.y * 300.0) * 0.04;
  vec3 color = u_baseColor + vec3(scanline);

  // Main Bar Body (Mechanical glow gradient)
  if (uv.y <= barHeight) {
    float heightRatio = uv.y / max(0.001, barHeight);
    vec3 barColor = mix(u_glowColor * 0.6, u_glowColor, heightRatio);
    // Subtle mechanical stepped grid (VU meter segments)
    float segment = step(0.15, fract(uv.y * 40.0));
    color = mix(barColor * 0.35, barColor, segment);
  }

  // Peak-Hold Ghost Line (The glowing mechanical phantom needle)
  if (u_dynamicsMode == 0 || u_dynamicsMode == 2) {
    float peakDist = abs(uv.y - peakLine * 0.85);
    float peakGlow = smoothstep(0.012, 0.001, peakDist);
    color += u_peakColor * peakGlow * 1.5;
  }

  // Ambient Neon Emission & Bloom Falloff
  float bloom = exp(-max(0.0, distFromBar) * 16.0) * 0.45;
  color += u_glowColor * bloom;

  // Edge Vignette & Cybernetic Framing
  vec2 vignetteUv = uv * (1.0 - uv.yx);
  float vignette = vignetteUv.x * vignetteUv.y * 15.0;
  vignette = clamp(pow(vignette, 0.25), 0.0, 1.0);
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;
