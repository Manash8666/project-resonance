// apps/desktop/src/renderer/store/useResonanceStore.ts
import { create } from 'zustand';
import type { Track } from '../types/track.js';
import type { WordTimestamp } from 'library-core';

// --- SLICE A: THE VAULT (Library Data & Metadata) ---
export interface VaultState {
  tracks: Track[];
  trackCount: number;
  selectedTrackId: number | null;
  selectedTrack: Track | null;
  isScanning: boolean;
  searchQuery: string;
  setTracks: (tracks: Track[]) => void;
  setTrackCount: (count: number) => void;
  setSelectedTrackId: (id: number | null) => void;
  setSelectedTrack: (track: Track | null) => void;
  setScanning: (status: boolean) => void;
  setSearchQuery: (query: string) => void;
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
  setBackgroundImageUrl: (url: string | null) => void;
  setDynamicsMode: (mode: 'ballistic' | 'fluid' | 'hybrid') => void;
  updateShaderParam: (key: string, value: number | boolean) => void;
  setExportModalOpen: (open: boolean) => void;
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
  setBands: (bands: { bass: number; mid: number; treble: number }) => void;
  setActiveLyrics: (lyrics: WordTimestamp[] | null) => void;
  setActiveWord: (word: WordTimestamp | null) => void;
  setIsPlaying: (status: boolean) => void;
  setScrubbing: (status: boolean) => void;
  seekTo: (time: number) => void;
}

export type ResonanceStore = VaultState & ForgeState & TelemetryState;

export const useResonanceStore = create<ResonanceStore>((set) => ({
  // Vault Initializers
  tracks: [],
  trackCount: 0,
  selectedTrackId: null,
  selectedTrack: null,
  isScanning: false,
  searchQuery: '',
  setTracks: (tracks) => set({ tracks }),
  setTrackCount: (trackCount) => set({ trackCount }),
  setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setScanning: (isScanning) => set({ isScanning }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

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
  setBackgroundImageUrl: (backgroundImageUrl) => set({ backgroundImageUrl }),
  setDynamicsMode: (dynamicsMode) => set({ dynamicsMode }),
  updateShaderParam: (key, value) =>
    set((state) => ({
      shaderParams: { ...state.shaderParams, [key]: value },
    })),
  setExportModalOpen: (isExportModalOpen) => set({ isExportModalOpen }),

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
  setBands: (bands) => set({ bands }),
  setActiveLyrics: (activeLyrics) => set({ activeLyrics }),
  setActiveWord: (activeWord) => set({ activeWord }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setScrubbing: (isScrubbing) =>
    set((state) => ({
      isScrubbing,
      // Record playback state when scrub begins
      wasPlayingBeforeScrub: isScrubbing ? state.isPlaying : state.wasPlayingBeforeScrub,
    })),
  seekTo: (time) => set({ currentTime: time }),
}));
