// apps/desktop/src/renderer/env.d.ts
// Exposes the contextBridge API as a typed global for the React renderer.
// Never import from 'electron' here — this file runs in the browser context.

import type { ResonanceAPI } from '../main/preload';

declare global {
  interface Window {
    resonance: ResonanceAPI;
    api: ResonanceAPI;
  }
}
