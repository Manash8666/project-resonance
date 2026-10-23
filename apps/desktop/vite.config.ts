import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Vite config for the renderer process only.
// The main process (Electron) is compiled separately via tsc.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, 'src/renderer'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Electron's contextBridge surfaces window.resonance — tell Vite not to
  // try to resolve it as an npm module.
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
});
