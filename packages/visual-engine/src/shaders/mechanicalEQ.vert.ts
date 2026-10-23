// packages/visual-engine/src/shaders/mechanicalEQ.vert.ts
export const mechanicalEQVertexShader = /* glsl */ `
uniform sampler2D u_audioTexture;
uniform float u_bass; // Macro: Drives physical scale and displacement
uniform float u_time;

varying vec2 vUv;
varying float v_elevation;

void main() {
    vUv = uv;
    vec3 pos = position;

    // 1. ZERO-ZERO DISPLACEMENT (Micro Layer)
    // We sample the exact frequency bin for this specific vertex's X position
    // Using green (ballistic) or red (raw) channel from our 4-channel texture
    vec4 telemetry = texture2D(u_audioTexture, vec2(uv.x, 0.5));
    float freqAmplitude = telemetry.g; // Ballistic with instant attack & gravity
    
    // Extrude the geometry upwards based on the audio frequency
    float elevation = freqAmplitude * 1.5; 
    
    // 2. BASS ACTUATION (Macro Layer)
    // Sub-bass scales the entire physical mass along with elevation
    elevation *= (1.0 + u_bass * 2.2);
    
    // Add subtle undulating fluid ripple along Z axis
    pos.z += telemetry.a * 0.4 * sin(uv.x * 20.0 + u_time * 2.0);
    pos.y += elevation;
    v_elevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;
