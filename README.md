Project Resonance

**A high-performance desktop audio workstation, offline neural transcriber, and real-time GPU visual telemetry engine.**

**Project Resonance** is an offline-first desktop digital audio workstation (DAW) and audiovisual synthesizer forged with Electron, React, TypeScript, and WebGL. Engineered with a cybernetic, dark-metal aesthetic, Resonance consolidates high-speed audio library management, on-device AI lyric transcription, hardware-accelerated 3D displacement shaders, and professional 4K 60FPS video rendering into a single portable executable.

### Core Architecture & Capabilities

* **High-Speed Library Core (SQLite & FTS5):** Powered by an embedded SQLite engine operating in WAL mode with a 64MB memory page cache. Delivers sub-millisecond Full-Text Search (FTS5) across titles, artists, albums, and genres. Leverages `music-metadata` for tag extraction across FLAC, MP3, WAV, OGG, and M4A, featuring binary album art caching and inline tag editing rendered through a virtualized `react-window` grid.
* **Offline Neural Acoustic Intelligence:** Integrates an on-device quantized Whisper ONNX model (`@huggingface/transformers`) to transcribe sung vocals without cloud APIs or telemetry tracking. An acoustic converter downmixes audio to 16kHz mono PCM, extracting millisecond-accurate word timestamps that synchronize with kinetic 3D typography in real time.
* **Zero-Overhead GPU Visualizer (R3F & GLSL):** Driven by React Three Fiber and Three.js, a 512×256 plane mesh undergoes live vertex displacement directly on the GPU. A dual-layer audio physics pipeline processes 2048 FFT bins across four channels—raw decibels, ballistic gravity decay, peak-hold meters, and fluid wave propagation—packaged into a 1D RGBA `DataTexture`.
* **Sovereign Audio Engine & Waveform Cache:** An isolated `AudioEngine.ts` singleton executes 4096-point FFT analysis on a dedicated 60 FPS `requestAnimationFrame` loop, completely decoupled from React's virtual DOM. Streams local audio over a privileged `media://` protocol, eliminates timeline scrubbing jitter, and caches 160-point acoustic waveform peaks in SQLite for instant scrubbing visualization.
* **Headless 4K / 60FPS Video Export Pipeline:** Captures offscreen WebGL framebuffers and pipes raw RGBA bitstreams directly into bundled `ffmpeg-static` to render pristine 1080p and 4K MP4 music visualizer videos with H.264/H.265 encoding.

Project Resonance is completely self-contained, portable, and free of external cloud dependencies—delivering studio-grade precision directly to your local audio library.
