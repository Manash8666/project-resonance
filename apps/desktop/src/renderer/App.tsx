// apps/desktop/src/renderer/App.tsx
import React, { useEffect, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  HeaderBar,
  VaultPane,
  ForgeViewport,
  InspectorRack,
  TimelineDeck,
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
  const isImmersive = useResonanceStore((state) => state.isImmersive);
  const setIsImmersive = useResonanceStore((state) => state.setIsImmersive);
  const autoImmersiveEnabled = useResonanceStore((state) => state.autoImmersiveEnabled);
  const isPlaying = useResonanceStore((state) => state.isPlaying);

  const [activeRibbonTab, setActiveRibbonTab] = useState('media');

  // Inactivity Detection: Auto-enters Immersive Mode after 20s idle during playback if enabled
  useEffect(() => {
    if (!autoImmersiveEnabled || !isPlaying || isImmersive) return;

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsImmersive(true);
      }, 20000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [autoImmersiveEnabled, isPlaying, isImmersive, setIsImmersive]);

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

  // ── Handlers injected downward from Composition Root ──
  const handlePlayTrack = async (track: Track) => {
    setSelectedTrackId(track.id);
    setSelectedTrack(track);
    try {
      await audioEngine.loadTrack(track.file_path);
      await audioEngine.play();
    } catch (err) {
      console.error('Playback initiation error:', err);
    }
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

  return (
    <div className="h-screen w-screen bg-[#07090d] text-zinc-100 flex flex-col overflow-hidden font-mono select-none relative">
      {/* 1. Header Bar (Top Dual-Tier Bar: Menus + Module Ribbon) */}
      <div
        className={`transition-all duration-500 ease-in-out z-20 shrink-0 ${
          isImmersive
            ? '-translate-y-full max-h-0 opacity-0 pointer-events-none overflow-hidden'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <HeaderBar
          onScan={handleScanLibrary}
          activeRibbonTab={activeRibbonTab}
          onRibbonTabChange={setActiveRibbonTab}
        />
      </div>

      {/* 2. Filmora-Style Multi-Pane Resizable Layout (Vertical Split: Upper Workspace + Bottom Timeline) */}
      <div className="flex-1 min-h-0 relative">
        <Group
          orientation="vertical"
          id="resonance-filmora-main-v3"
          defaultLayout={{
            'upper-workspace-panel-v3': 58,
            'timeline-panel-v3': 42,
          }}
          className="h-full w-full"
        >
          {/* Upper Workspace Panel (Horizontal Split: Asset Browser, Player Monitor, Inspector) */}
          <Panel
            defaultSize="58%"
            minSize="30%"
            id="upper-workspace-panel-v3"
          >
            <Group
              orientation="horizontal"
              id="upper-workspace-group-v3"
              defaultLayout={{
                'vault-panel-v3': 36,
                'forge-panel-v3': 40,
                'inspector-panel-v3': 24,
              }}
              className="h-full w-full"
            >
              {/* Upper Left: Media / Asset Browser (VaultPane) */}
              <Panel
                defaultSize="36%"
                minSize="22%"
                maxSize="50%"
                collapsible
                id="vault-panel-v3"
                className={`transition-opacity duration-300 ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <VaultPane onPlayTrack={handlePlayTrack} />
              </Panel>

              {/* Resizer Handle 1 (Vault <-> Forge) */}
              <Separator
                className={`w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/40 transition-colors flex items-center justify-center cursor-col-resize group ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
              </Separator>

              {/* Upper Center: The Player Viewport Monitor (ForgeViewport) */}
              <Panel
                defaultSize="40%"
                minSize="25%"
                id="forge-panel-v3"
              >
                <ForgeViewport audioElement={audioEngine.getAudioElement()} />
              </Panel>

              {/* Resizer Handle 2 (Forge <-> Inspector) */}
              <Separator
                className={`w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/40 transition-colors flex items-center justify-center cursor-col-resize group ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
              </Separator>

              {/* Upper Right: Inspector & Properties Rack (InspectorRack) */}
              <Panel
                defaultSize="24%"
                minSize="18%"
                maxSize="38%"
                collapsible
                id="inspector-panel-v3"
                className={`transition-opacity duration-300 ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <InspectorRack />
              </Panel>
            </Group>
          </Panel>

          {/* Horizontal Resizer Separator between Upper Workspace & Bottom Timeline */}
          <Separator
            className={`h-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/40 transition-colors flex items-center justify-center cursor-row-resize group z-20 ${
              isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="w-10 h-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
          </Separator>

          {/* Lower Workspace Panel: Multi-Track NLE Timeline Deck */}
          <Panel
            defaultSize="42%"
            minSize="20%"
            maxSize="65%"
            id="timeline-panel-v3"
            className={`transition-all duration-300 ${
              isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <TimelineDeck
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
            />
          </Panel>
        </Group>
      </div>

      {/* 3. 4K / 60FPS Video Export Modal */}
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
