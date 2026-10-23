import React, { useEffect, useRef, useState, useCallback } from 'react';
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

export default function App() {

  // Zustand Store Selectors
  const setTracks = useResonanceStore((s) => s.setTracks);
  const setTrackCount = useResonanceStore((s) => s.setTrackCount);
  const selectedTrack = useResonanceStore((s) => s.selectedTrack);
  const setSelectedTrack = useResonanceStore((s) => s.setSelectedTrack);
  const setSelectedTrackId = useResonanceStore((s) => s.setSelectedTrackId);
  const isPlaying = useResonanceStore((s) => s.isPlaying);
  const setIsPlaying = useResonanceStore((s) => s.setIsPlaying);
  const setCurrentTime = useResonanceStore((s) => s.setCurrentTime);
  const setDuration = useResonanceStore((s) => s.setDuration);
  const volume = useResonanceStore((s) => s.volume);
  const isScrubbing = useResonanceStore((s) => s.isScrubbing);
  const isExportModalOpen = useResonanceStore((s) => s.isExportModalOpen);
  const setExportModalOpen = useResonanceStore((s) => s.setExportModalOpen);
  const searchQuery = useResonanceStore((s) => s.searchQuery);
  const setActiveLyrics = useResonanceStore((s) => s.setActiveLyrics);

  // Local component states
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null);
  const artCache = useRef<Map<number, string | null>>(new Map());

  // Load tracks on mount and upon search query changes
  const loadTracks = useCallback(async () => {
    try {
      if (searchQuery.trim().length > 0) {
        const results = await window.resonance.searchTracks(searchQuery.trim(), 500);
        setTracks(results as any);
        setTrackCount(results.length);
      } else {
        const [data, count] = await Promise.all([
          window.resonance.getTracks(2000, 0),
          window.resonance.getTrackCount(),
        ]);
        setTracks(data as any);
        setTrackCount(count);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
    }
  }, [searchQuery, setTracks, setTrackCount]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Load cover art and lyrics when selected track changes
  useEffect(() => {
    if (!selectedTrack) {
      setCoverArtUrl(null);
      setActiveLyrics(null);
      return;
    }

    // 1. Fetch cover art
    if (artCache.current.has(selectedTrack.id)) {
      setCoverArtUrl(artCache.current.get(selectedTrack.id) ?? null);
    } else {
      window.resonance
        .getCoverArt(selectedTrack.id)
        .then((art) => {
          artCache.current.set(selectedTrack.id, art);
          setCoverArtUrl(art);
        })
        .catch(() => setCoverArtUrl(null));
    }

    // 2. Fetch lyrics if available
    window.resonance
      .getLyrics(selectedTrack.id)
      .then((lyrics) => {
        setActiveLyrics(lyrics as any);
      })
      .catch(() => setActiveLyrics(null));

    // 3. Fetch or compute waveform peaks preview
    if (!selectedTrack.waveform_peaks) {
      window.resonance
        .getWaveform(selectedTrack.id)
        .then(async (peaks) => {
          if (peaks && peaks.length > 0) {
            setSelectedTrack({ ...selectedTrack, waveform_peaks: JSON.stringify(peaks) });
          } else {
            try {
              const formattedUrl = `media:///${encodeURIComponent(selectedTrack.file_path)}`;
              const resp = await fetch(formattedUrl);
              const arrayBuf = await resp.arrayBuffer();
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              const tempCtx = new AudioCtx();
              const audioBuf = await tempCtx.decodeAudioData(arrayBuf);
              const channel = audioBuf.getChannelData(0);
              const numSamples = 160;
              const blockSize = Math.floor(channel.length / numSamples);
              const generatedPeaks: number[] = [];
              for (let i = 0; i < numSamples; i++) {
                let max = 0;
                const start = i * blockSize;
                for (let j = 0; j < blockSize; j += 8) {
                  const val = Math.abs(channel[start + j]);
                  if (val > max) max = val;
                }
                generatedPeaks.push(parseFloat(Math.max(0.06, Math.min(1.0, max)).toFixed(3)));
              }
              tempCtx.close();
              await window.resonance.saveWaveform(selectedTrack.id, generatedPeaks);
              setSelectedTrack({ ...selectedTrack, waveform_peaks: JSON.stringify(generatedPeaks) });
            } catch (err) {
              console.error('Waveform generation error:', err);
            }
          }
        })
        .catch(() => {});
    }
  }, [selectedTrack?.id, setActiveLyrics, setSelectedTrack]);

  // Playback control via singleton AudioEngine
  const playTrack = (track: Track) => {
    setSelectedTrack(track);
    setSelectedTrackId(track.id);
    audioEngine.loadTrack(track.file_path);
    audioEngine.play();
  };

  const togglePlayPause = () => {
    audioEngine.toggle();
  };

  const handleSeek = (newTimeSec: number) => {
    audioEngine.seek(newTimeSec);
  };

  // Auto-transcribe vocals with Whisper ONNX
  const handleAutoTranscribe = async () => {
    if (!selectedTrack) return;
    setIsTranscribing(true);
    setTranscriptionStatus('Engaging Whisper AI: Downmixing audio to 16kHz mono & calculating word timestamps...');
    try {
      const timestamps = await window.resonance.transcribeTrack(selectedTrack.file_path);
      await window.resonance.saveLyrics(selectedTrack.id, timestamps as any, timestamps.length === 0);
      setActiveLyrics(timestamps as any);
      setSelectedTrack({ ...selectedTrack, has_lyrics: timestamps.length > 0 ? 1 : 0 });
      setTracks(
        useResonanceStore.getState().tracks.map((t) =>
          t.id === selectedTrack.id ? { ...t, has_lyrics: timestamps.length > 0 ? 1 : 0 } : t
        )
      );
      setTranscriptionStatus(`✓ Vocal Telemetry Locked: ${timestamps.length} words synchronized.`);
      setTimeout(() => setTranscriptionStatus(null), 3500);
    } catch (err) {
      console.error('Auto-transcribe failed:', err);
      setTranscriptionStatus(`Transcription error: ${String(err)}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#07090d] text-zinc-100 flex flex-col overflow-hidden font-mono select-none">
      {/* 1. Header Bar */}
      <HeaderBar />

      {/* 2. Main DAW Resizable Workspace */}
      <Group orientation="horizontal" id="resonance-cockpit-layout" className="flex-1 min-h-0">
        {/* Left: The Vault (Library Grid) */}
        <Panel defaultSize="26%" minSize="16%" maxSize="45%" collapsible id="vault-panel">
          <VaultPane onPlayTrack={playTrack} />
        </Panel>

        {/* Resizer Handle 1 */}
        <Separator className="w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/30 transition-colors flex items-center justify-center cursor-col-resize group">
          <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
        </Separator>

        {/* Center: The Forge (3D GPU Viewport) */}
        <Panel minSize="30%" id="forge-panel">
          <ForgeViewport audioElement={audioEngine.getAudioElement()} coverArtUrl={coverArtUrl} />
        </Panel>

        {/* Resizer Handle 2 */}
        <Separator className="w-1.5 bg-[#0b0e14] hover:bg-[#00f0ff]/30 transition-colors flex items-center justify-center cursor-col-resize group">
          <div className="h-6 w-0.5 bg-[#1b2330] group-hover:bg-[#00f0ff] rounded" />
        </Separator>

        {/* Right: The Inspector & Kinetics Rack */}
        <Panel defaultSize="22%" minSize="16%" maxSize="35%" collapsible id="inspector-panel">
          <InspectorRack
            coverArtUrl={coverArtUrl}
            onAutoTranscribe={handleAutoTranscribe}
            isTranscribing={isTranscribing}
            transcriptionStatus={transcriptionStatus}
          />
        </Panel>
      </Group>

      {/* 3. Master Transport Deck */}
      <TransportDeck
        onTogglePlay={togglePlayPause}
        onSeek={handleSeek}
        onVolumeChange={(vol) => {
          audioEngine.setVolume(vol);
        }}
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
}
