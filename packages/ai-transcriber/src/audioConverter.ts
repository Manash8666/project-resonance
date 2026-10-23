// packages/ai-transcriber/src/audioConverter.ts
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import os from 'os';

// Robust path resolution for ffmpeg-static across ESM / CJS module bundlers
const resolvedFfmpegPath =
  typeof ffmpegPath === 'string'
    ? ffmpegPath
    : (ffmpegPath as any)?.default || (ffmpegPath as unknown as string);

if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

/**
 * Translates any source audio (MP3, FLAC, high-res WAV, AAC)
 * into the acoustic frequency Whisper requires: 16kHz, 1-channel mono, 16-bit PCM WAV.
 */
export async function prepareAudioForWhisper(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(
      tempDir,
      `resonance_whisper_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`
    );

    ffmpeg(inputPath)
      .audioFrequency(16000)   // Whisper requires exactly 16kHz
      .audioChannels(1)        // Whisper requires mono
      .audioCodec('pcm_s16le') // 16-bit linear PCM WAV
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`Acoustic conversion failed: ${err.message}`)))
      .run();
  });
}
