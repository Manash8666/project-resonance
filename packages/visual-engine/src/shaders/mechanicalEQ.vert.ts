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
    vec4 telemetry = texture2D(u_audioTexture, vec2(uv.x, 0.5));
    float freqAmplitude = telemetry.g; // Ballistic with instant attack & gravity
    
    // Ambient resting pulse so the mesh is always alive and visible
    float restingBreath = sin(uv.x * 10.0 + u_time * 1.6) * cos(uv.y * 5.0 + u_time * 0.9) * 0.08;
    
    // Extrude geometry upwards based on audio frequency + resting breath
    float elevation = (freqAmplitude * 2.2 + restingBreath);
    
    // 2. BASS ACTUATION (Macro Layer)
    elevation *= (1.0 + u_bass * 2.5);
    
    // Subtle undulating fluid ripple along Z axis
    pos.z += (telemetry.a * 0.4 + 0.03) * sin(uv.x * 20.0 + u_time * 2.2);
    pos.y += elevation;
    v_elevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;
