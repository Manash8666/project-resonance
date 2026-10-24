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
        let list: Track[] = [];
        if (Array.isArray(result)) {
          list = result;
        } else if (result?.success && result.data) {
          list = result.data;
        }
        setTracks(list);
        setTrackCount(list.length);

        if (list.length > 0) {
          const firstTrack = list[0];
          setSelectedTrackId(firstTrack.id);
          setSelectedTrack(firstTrack);
          void audioEngine.loadTrack(firstTrack.file_path);
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
  }, [setTracks, setTrackCount, setSelectedTrackId, setSelectedTrack]);

  const handleScanLibrary = async () => {
    setScanning(true);
    try {
      const folderPath = await window.resonance.selectFolder();
      if (folderPath) {
        const result = await window.resonance.scanDirectory(folderPath);
        if (result?.success !== false) {
          const fresh = await window.resonance.getTracks(1000, 0);
          let list: Track[] = [];
          if (Array.isArray(fresh)) {
            list = fresh;
          } else if (fresh?.success && fresh.data) {
            list = fresh.data;
          }
          setTracks(list);
          setTrackCount(list.length);
          if (list.length > 0 && !selectedTrack) {
            setSelectedTrackId(list[0].id);
            setSelectedTrack(list[0]);
            void audioEngine.loadTrack(list[0].file_path);
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

  const handleTogglePlay = async () => {
    let track = selectedTrack;
    if (!track) {
      const currentTracks = useResonanceStore.getState().tracks;
      if (currentTracks.length > 0) {
        track = currentTracks[0];
        setSelectedTrackId(track.id);
        setSelectedTrack(track);
      }
    }
    if (track) {
      const el = audioEngine.getAudioElement();
      if (!el.src || el.src === window.location.href || !el.src.includes(track.file_path.substring(0, 20))) {
        await audioEngine.loadTrack(track.file_path);
      }
    }
    await audioEngine.toggle();
  };

  const handleSeek = (timeInSeconds: number) => {
    audioEngine.seek(timeInSeconds);
  };

  // ── Global NLE Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Ctrl+E / Cmd+E: Trigger Video Export Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setExportModalOpen(true);
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          void handleTogglePlay();
          break;
        case 'KeyJ':
          e.preventDefault();
          handleSeek(Math.max(0, useResonanceStore.getState().currentTime - 5));
          break;
        case 'KeyL':
          e.preventDefault();
          handleSeek(Math.min(useResonanceStore.getState().duration || 60, useResonanceStore.getState().currentTime + 5));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, useResonanceStore.getState().currentTime - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(useResonanceStore.getState().duration || 60, useResonanceStore.getState().currentTime + 1));
          break;
        case 'KeyF':
          e.preventDefault();
          setIsImmersive(!isImmersive);
          break;
        case 'Escape':
          if (isImmersive) {
            e.preventDefault();
            setIsImmersive(false);
          } else if (isExportModalOpen) {
            e.preventDefault();
            setExportModalOpen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrack, isImmersive, isExportModalOpen]);

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

      {/* 2. DAW Grid Multi-Pane Resizable Layout */}
      <div className="flex-1 min-h-0 relative bg-[#050505]">
        <Group
          orientation="vertical"
          id="resonance-daw-grid-main"
          defaultLayout={{
            'upper-workspace-panel': 68,
            'timeline-panel': 32,
          }}
          className="h-full w-full"
        >
          {/* Upper Workspace Panel (Horizontal Split: The Vault 25%, The Forge 50%, The Rack 25%) */}
          <Panel
            defaultSize="68%"
            minSize="30%"
            id="upper-workspace-panel"
          >
            <Group
              orientation="horizontal"
              id="upper-workspace-group"
              defaultLayout={{
                'vault-panel': 25,
                'forge-panel': 50,
                'inspector-panel': 25,
              }}
              className="h-full w-full"
            >
              {/* Upper Left: The Vault (Visual Asset Grid - 25% default) */}
              <Panel
                defaultSize="25%"
                minSize="18%"
                maxSize="40%"
                collapsible
                id="vault-panel"
                className={`transition-opacity duration-300 ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <VaultPane onPlayTrack={handlePlayTrack} />
              </Panel>

              {/* Resizer Handle 1 (Vault <-> Forge) */}
              <Separator
                className={`w-1 bg-[#18181b] hover:bg-[#00ffff]/40 hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all flex items-center justify-center cursor-col-resize group border-x border-[#27272a]/50 ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="h-8 w-0.5 bg-[#27272a] group-hover:bg-[#00ffff] rounded transition-colors" />
              </Separator>

              {/* Upper Center: The Forge Viewport (50% default) */}
              <Panel
                defaultSize="50%"
                minSize="30%"
                id="forge-panel"
              >
                <ForgeViewport audioElement={audioEngine.getAudioElement()} />
              </Panel>

              {/* Resizer Handle 2 (Forge <-> Inspector) */}
              <Separator
                className={`w-1 bg-[#18181b] hover:bg-[#00ffff]/40 hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all flex items-center justify-center cursor-col-resize group border-x border-[#27272a]/50 ${
                  isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="h-8 w-0.5 bg-[#27272a] group-hover:bg-[#00ffff] rounded transition-colors" />
              </Separator>

              {/* Upper Right: The Rack Inspector (25% default) */}
              <Panel
                defaultSize="25%"
                minSize="18%"
                maxSize="40%"
                collapsible
                id="inspector-panel"
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
            className={`h-1 bg-[#18181b] hover:bg-[#00ffff]/40 hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all flex items-center justify-center cursor-row-resize group z-20 border-y border-[#27272a]/50 ${
              isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="w-12 h-0.5 bg-[#27272a] group-hover:bg-[#00ffff] rounded transition-colors" />
          </Separator>

          {/* Lower Workspace Panel: The Sequence Multi-Track NLE Timeline */}
          <Panel
            defaultSize="32%"
            minSize="20%"
            maxSize="60%"
            id="timeline-panel"
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
