// packages/visual-engine/src/shaders/mechanicalEQ.frag.ts
export const mechanicalEQFragmentShader = /* glsl */ `
uniform float u_mid;    // Macro: Drives emission/glow
uniform float u_treble; // Macro: Drives high-frequency surface noise
uniform vec3 u_baseColor;
uniform vec3 u_glowColor;

varying vec2 vUv;
varying float v_elevation;

void main() {
    // Base mechanical dark metal
    vec3 color = u_baseColor * 0.25;

    // 1. MID-RANGE EMISSION (Macro Layer)
    // As mid-range (vocals/leads/snares) swells, the geometry glows intensely
    float glowIntensity = smoothstep(0.08, 0.75, u_mid);
    color = mix(color, u_glowColor, glowIntensity * 0.85);

    // 2. TREBLE SURFACE NOISE (Macro Layer)
    // High-frequency transients create micro-vibrations across the metal surface
    float noise = fract(sin(dot(vUv * (u_treble * 50.0 + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    color += vec3(noise * u_treble * 0.35);

    // 3. DEPTH FOG (Blender-like volumetric falloff into the horizon)
    float depthFade = smoothstep(0.0, 1.0, vUv.y);
    color *= depthFade;

    // 4. SHARP RIM LIGHTING based on displacement elevation
    float rim = smoothstep(0.4, 1.6, v_elevation);
    color += u_glowColor * rim * 0.6;

    gl_FragColor = vec4(color, 1.0);
}
`;
