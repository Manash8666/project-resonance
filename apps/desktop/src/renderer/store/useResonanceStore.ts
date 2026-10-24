// apps/desktop/src/renderer/store/useResonanceStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Track } from '../types/track.js';
import type { WordTimestamp } from 'library-core';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

// --- SLICE A: THE VAULT (Library Data & Metadata) ---
export interface VaultState {
  tracks: Track[];
  trackCount: number;
  selectedTrackId: number | null;
  selectedTrack: Track | null;
  scanStatus: AsyncStatus;
  scanError: string | null;
  searchQuery: string;
  setTracks: (tracks: Track[]) => void;
  setTrackCount: (count: number) => void;
  setSelectedTrackId: (id: number | null) => void;
  setSelectedTrack: (track: Track | null) => void;
  setScanStatus: (status: AsyncStatus, error?: string | null) => void;
  setScanning: (scanning: boolean) => void;
  setSearchQuery: (query: string) => void;
  scanLibrary: (dirPath: string) => Promise<void>;
}

// --- SLICE B: THE FORGE (Visual & Shader Calibration) ---
export interface ForgeState {
  backgroundImageUrl: string | null;
  dynamicsMode: 'ballistic' | 'fluid' | 'hybrid';
  shaderParams: {
    bassMultiplier: number;
    midGlowIntensity: number;
    trebleShakeIntensity: number;
    wireframe: boolean;
  };
  isExportModalOpen: boolean;
  isImmersive: boolean;
  autoImmersiveEnabled: boolean;
  timelineTool: 'select' | 'split' | 'text';
  setBackgroundImageUrl: (url: string | null) => void;
  setDynamicsMode: (mode: 'ballistic' | 'fluid' | 'hybrid') => void;
  updateShaderParam: (key: string, value: number | boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setIsImmersive: (isImmersive: boolean) => void;
  setAutoImmersiveEnabled: (enabled: boolean) => void;
  toggleImmersive: () => void;
  setTimelineTool: (tool: 'select' | 'split' | 'text') => void;
}

// --- SLICE C: THE TELEMETRY (Isolated 60fps Real-Time Audio) ---
export interface TelemetryState {
  currentTime: number;
  duration: number;
  volume: number;
  bands: { bass: number; mid: number; treble: number };
  activeLyrics: WordTimestamp[] | null;
  activeWord: WordTimestamp | null;
  isPlaying: boolean;
  isScrubbing: boolean;
  wasPlayingBeforeScrub: boolean;
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  setVolume: (vol: number) => void;
  setMacroBands: (bands: { bass: number; mid: number; treble: number }) => void;
  setActiveLyrics: (lyrics: WordTimestamp[] | null) => void;
  setActiveWord: (word: WordTimestamp | null) => void;
  setIsPlaying: (status: boolean) => void;
  setScrubbing: (status: boolean) => void;
  seekTo: (time: number) => void;
}

export type ResonanceStore = VaultState & ForgeState & TelemetryState;

export const useResonanceStore = create<ResonanceStore>()(
  persist(
    (set) => ({
      // Vault Initializers
      tracks: [],
      trackCount: 0,
      selectedTrackId: null,
      selectedTrack: null,
      scanStatus: 'idle',
      scanError: null,
      searchQuery: '',
      setTracks: (tracks) => set({ tracks, scanStatus: 'success' }),
      setTrackCount: (trackCount) => set({ trackCount }),
      setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),
      setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
      setScanStatus: (scanStatus, scanError = null) => set({ scanStatus, scanError }),
      setScanning: (scanning: boolean) => set({ scanStatus: scanning ? 'loading' : 'idle' }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      scanLibrary: async (dirPath: string) => {
        set({ scanStatus: 'loading', scanError: null });
        try {
          const result = await window.resonance.scanDirectory(dirPath);
          const [data, count] = await Promise.all([
            window.resonance.getTracks(2000, 0),
            window.resonance.getTrackCount(),
          ]);
          set({
            tracks: data as any,
            trackCount: count,
            scanStatus: 'success',
          });
        } catch (err: any) {
          set({ scanStatus: 'error', scanError: err.message || 'Scan failed' });
        }
      },

      // Forge Initializers
      backgroundImageUrl: null,
      dynamicsMode: 'ballistic',
      shaderParams: {
        bassMultiplier: 1.5,
        midGlowIntensity: 0.8,
        trebleShakeIntensity: 0.05,
        wireframe: false,
      },
      isExportModalOpen: false,
      isImmersive: false,
      autoImmersiveEnabled: false,
      timelineTool: 'select',
      setBackgroundImageUrl: (backgroundImageUrl) => set({ backgroundImageUrl }),
      setDynamicsMode: (dynamicsMode) => set({ dynamicsMode }),
      updateShaderParam: (key, value) =>
        set((state) => ({
          shaderParams: { ...state.shaderParams, [key]: value },
        })),
      setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),
      setIsImmersive: (isImmersive) => set({ isImmersive }),
      setAutoImmersiveEnabled: (autoImmersiveEnabled) => set({ autoImmersiveEnabled }),
      toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
      setTimelineTool: (timelineTool) => set({ timelineTool }),

      // Telemetry Initializers
      currentTime: 0,
      duration: 0,
      volume: 0.85,
      bands: { bass: 0, mid: 0, treble: 0 },
      activeLyrics: null,
      activeWord: null,
      isPlaying: false,
      isScrubbing: false,
      wasPlayingBeforeScrub: false,
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
      setMacroBands: (bands) => set({ bands }),
      setActiveLyrics: (activeLyrics) => set({ activeLyrics }),
      setActiveWord: (activeWord) => set({ activeWord }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setScrubbing: (isScrubbing) =>
        set((state) => ({
          isScrubbing,
          wasPlayingBeforeScrub: isScrubbing ? state.isPlaying : state.wasPlayingBeforeScrub,
        })),
      seekTo: (time) => set({ currentTime: time }),
    }),
    {
      name: 'resonance-hardware-config',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          if (window.resonance?.getConfig) {
            const data = await window.resonance.getConfig(name);
            return data ? JSON.stringify(data) : null;
          }
          return localStorage.getItem(name);
        },
        setItem: async (name: string, value: string) => {
          if (window.resonance?.setConfig) {
            await window.resonance.setConfig(name, JSON.parse(value));
            return;
          }
          localStorage.setItem(name, value);
        },
        removeItem: async (name: string) => {
          if (window.resonance?.removeConfig) {
            await window.resonance.removeConfig(name);
            return;
          }
          localStorage.removeItem(name);
        },
      })),
      // Only persist configuration and UI preferences, never high-speed telemetry
      partialize: (state) => ({
        shaderParams: state.shaderParams,
        dynamicsMode: state.dynamicsMode,
        backgroundImageUrl: state.backgroundImageUrl,
        selectedTrackId: state.selectedTrackId,
        volume: state.volume,
      }),
    }
  )
);
