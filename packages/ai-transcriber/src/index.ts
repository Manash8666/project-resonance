// packages/ai-transcriber/src/index.ts
import { pipeline } from '@huggingface/transformers';
import { prepareAudioForWhisper } from './audioConverter.js';
import fs from 'fs';

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export class TranscriptionEngine {
  private transcriber: any = null;
  private isInitializing: boolean = false;

  /**
   * Initializes the Whisper ONNX pipeline.
   * Downloads the model weights to the local cache on the first launch,
   * then executes entirely offline with zero cloud dependency.
   */
  async initialize(onProgress?: (progress: any) => void): Promise<void> {
    if (this.transcriber) return;
    if (this.isInitializing) {
      // Avoid duplicate concurrent init
      while (this.isInitializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return;
    }

    this.isInitializing = true;
    try {
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-small',
        {
          progress_callback: onProgress,
          // Quantized 8-bit model for low memory footprint and high inference speed
          dtype: 'q8',
        }
      );
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Translates incoming audio to 16kHz mono WAV, performs inference,
   * extracts word-level timestamps, and cleans up the temporary PCM file.
   */
  async transcribe(audioFilePath: string): Promise<WordTimestamp[]> {
    if (!this.transcriber) {
      await this.initialize();
    }

    // 1. Translate the input audio (FLAC, MP3, WAV, AAC) to 16kHz mono WAV
    const preparedWavPath = await prepareAudioForWhisper(audioFilePath);

    try {
      // 2. Execute Whisper ASR with word-level timestamp extraction
      const output: any = await this.transcriber(preparedWavPath, {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'auto',
        task: 'transcribe',
      });

      // 3. Normalize into clean WordTimestamp structures
      const words: WordTimestamp[] = [];
      if (output?.chunks && Array.isArray(output.chunks)) {
        for (const chunk of output.chunks) {
          if (chunk.timestamp && chunk.text) {
            words.push({
              word: chunk.text.trim(),
              start: Number(chunk.timestamp[0]) || 0,
              end: Number(chunk.timestamp[1]) || (Number(chunk.timestamp[0]) + 0.3),
            });
          }
        }
      }

      return words;
    } finally {
      // 4. Clean up temporary 16kHz PCM file from OS temp directory
      if (fs.existsSync(preparedWavPath)) {
        try {
          fs.unlinkSync(preparedWavPath);
        } catch (cleanupErr) {
          console.warn('Failed to clean up temp WAV file:', cleanupErr);
        }
      }
    }
  }
}

export { prepareAudioForWhisper };
