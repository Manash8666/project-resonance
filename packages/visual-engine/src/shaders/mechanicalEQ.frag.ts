// packages/visual-engine/src/shaders/mechanicalEQ.frag.ts
export const mechanicalEQFragmentShader = /* glsl */ `
uniform float u_bass;
uniform float u_mid;    // Macro: Drives emission/glow
uniform float u_treble; // Macro: Drives high-frequency surface noise
uniform float u_time;
uniform vec3 u_baseColor;
uniform vec3 u_glowColor;

varying vec2 vUv;
varying float v_elevation;

void main() {
    // 1. Base cybernetic chassis material (Dark titanium / deep navy)
    vec3 baseChassis = vec3(0.04, 0.07, 0.12);
    
    // 2. Cybernetic Frequency Grid / Contour Lines
    // 64 frequency column lines along X, 32 depth division lines along Y
    vec2 gridUv = fract(vec2(vUv.x * 64.0, vUv.y * 32.0));
    float lineX = smoothstep(0.08, 0.0, gridUv.x) + smoothstep(0.92, 1.0, gridUv.x);
    float lineY = smoothstep(0.08, 0.0, gridUv.y) + smoothstep(0.92, 1.0, gridUv.y);
    float grid = clamp(lineX + lineY, 0.0, 1.0);
    
    // 3. Grid Line Color: Neon Cyan / Electric Blue with ambient visibility
    vec3 gridColor = mix(vec3(0.0, 0.6, 0.95), u_glowColor, 0.7);
    vec3 color = mix(baseChassis, gridColor, grid * 0.45);
    
    // 4. Elevation Highlight: Heights glow brighter with neon cyan/magenta
    float heightGlow = smoothstep(-0.05, 1.4, v_elevation);
    vec3 elevationColor = mix(u_glowColor, vec3(0.95, 0.25, 0.85), smoothstep(0.4, 1.6, v_elevation));
    color += elevationColor * heightGlow * (0.65 + u_bass * 0.8);
    
    // 5. MID-RANGE EMISSION (Vocal & Lead swells)
    float midGlow = smoothstep(0.05, 0.7, u_mid);
    color += u_glowColor * midGlow * 0.75;

    // 6. TREBLE SURFACE SPARKLE
    float noise = fract(sin(dot(vUv * (u_treble * 80.0 + 10.0), vec2(12.9898, 78.233))) * 43758.5453);
    color += vec3(noise * (u_treble * 0.5 + 0.05) * 0.25);

    // 7. Depth horizon fade (Soft gradient towards the dark background)
    float horizonFade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
    color = mix(vec3(0.02, 0.03, 0.05), color, clamp(horizonFade + 0.35, 0.0, 1.0));

    // 8. Resting ambient rim pulse (Always alive)
    float rimPulse = 0.2 + 0.12 * sin(u_time * 2.2 + vUv.x * 6.0);
    color += u_glowColor * rimPulse * (1.0 - smoothstep(0.0, 0.5, vUv.y)) * 0.5;

    gl_FragColor = vec4(color, 1.0);
}
`;
