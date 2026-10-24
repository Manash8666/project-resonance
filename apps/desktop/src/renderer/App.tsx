// apps/desktop/src/renderer/App.tsx
import React, { useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  HeaderBar,
  VaultPane,
  ForgeViewport,
  InspectorRack,
  TransportDeck,
} from './components/cockpit/index.js';
import { ExportModal } from './components/ExportModal.js';
import { useResonanceStore } from './store/useResonanceStore.js';
import { audioEngine } from './audio/AudioEngine.js';
import type { Track } from './types/track.js';

const App: React.FC = () => {
  // Composition Root: Orchestrates state, backend IPC, and audio hardware bindings
  const setTracks = useResonanceStore((state) => state.setTracks);
  const setScanning = useResonanceStore((state) => state.setScanning);
  const setTrackCount = useResonanceStore((state) => state.setTrackCount);
  const isExportModalOpen = useResonanceStore((state) => state.isExportModalOpen);
  const setExportModalOpen = useResonanceStore((state) => state.setExportModalOpen);
  const selectedTrack = useResonanceStore((state) => state.selectedTrack);
  const setSelectedTrackId = useResonanceStore((state) => state.setSelectedTrackId);
  const setSelectedTrack = useResonanceStore((state) => state.setSelectedTrack);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!window.resonance?.getTracks) {
          console.warn('[Resonance] window.resonance bridge is not ready');
          return;
        }
        // Load initial tracks from the SQLite backend on startup
        const result = await window.resonance.getTracks(1000, 0);
        if (Array.isArray(result)) {
          setTracks(result);
          setTrackCount(result.length);
        } else if (result?.success && result.data) {
          setTracks(result.data);
          setTrackCount(result.data.length);
        }
      } catch (error) {
        console.error('Failed to initialize library:', error);
      }
    };

    void initializeApp();

    const cleanupTeardown = window.resonance?.onTeardown?.(() => {
      audioEngine.destroy();
    });

    return () => {
      cleanupTeardown?.();
    };
  }, [setTracks, setTrackCount]);

  const handleScanLibrary = async () => {
    setScanning(true);
    try {
      const folderPath = await window.resonance.selectFolder();
      if (folderPath) {
        const result = await window.resonance.scanDirectory(folderPath);
        if (result?.success !== false) {
          const fresh = await window.resonance.getTracks(1000, 0);
          if (Array.isArray(fresh)) {
            setTracks(fresh);
            setTrackCount(fresh.length);
          } else if (fresh?.success && fresh.data) {
            setTracks(fresh.data);
            setTrackCount(fresh.data.length);
          }
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // ── Dependency Injection: Handlers injected downward from Composition Root ──
  const handlePlayTrack = (track: Track) => {
    setSelectedTrackId(track.id);
    setSelectedTrack(track);
    audioEngine.loadTrack(track.file_path);
    void audioEngine.play();
  };

  const handleTogglePlay = () => {
    const el = audioEngine.getAudioElement();
    if ((!el.src || el.src === window.location.href) && selectedTrack) {
      audioEngine.loadTrack(selectedTrack.file_path);
    }
    void audioEngine.toggle();
  };

  const handleSeek = (timeInSeconds: number) => {
    audioEngine.seek(timeInSeconds);
  };

  const handleVolumeChange = (vol: number) => {
    audioEngine.setVolume(vol);
  };

  return (
    <div className="h-screen w-screen bg-[#07090d] text-zinc-100 flex flex-col overflow-hidden font-mono select-none">
      {/* 1. Header Bar (Top) */}
      <HeaderBar onScan={handleScanLibrary} />

      {/* 2. Main DAW Resizable Workspace (Middle) */}
      <Group orientation="horizontal" id="resonance-cockpit-layout" className="flex-1 min-h-0">
        {/* Left: The Vault (Library) with Injected Play Handler */}
        <Panel defaultSize="26%" minSize="16%" maxSize="45%" collapsible id="vault-panel">
          <VaultPane onPlayTrack={handlePlayTrack} />
        </Panel>

        {/* Resizer Handle 1 */}
        <Separator className="w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/30 transition-colors flex items-center justify-center cursor-col-resize group">
          <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
        </Separator>

        {/* Center: The Forge (3D Canvas) with Injected Audio Element & Data Texture */}
        <Panel minSize="30%" id="forge-panel">
          <ForgeViewport
            audioElement={audioEngine.getAudioElement()}
          />
        </Panel>

        {/* Resizer Handle 2 */}
        <Separator className="w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/30 transition-colors flex items-center justify-center cursor-col-resize group">
          <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
        </Separator>

        {/* Right: The Inspector Rack (Controls & Kinetics) */}
        <Panel defaultSize="22%" minSize="16%" maxSize="35%" collapsible id="inspector-panel">
          <InspectorRack />
        </Panel>
      </Group>

      {/* 3. Transport Deck (Bottom) with Injected Control Cables */}
      <TransportDeck
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
      />

      {/* 4. 4K / 60FPS Video Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        audioFilePath={selectedTrack?.file_path || ''}
        trackTitle={selectedTrack?.title || selectedTrack?.file_name || 'Audio Track'}
        trackArtist={selectedTrack?.artist_name || 'Unknown Artist'}
      />
    </div>
  );
};

export default App;
