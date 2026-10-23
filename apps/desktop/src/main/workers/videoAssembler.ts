// apps/desktop/src/main/workers/videoAssembler.ts
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough } from 'stream';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

export interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  codec: 'libx264' | 'libx265';
  audioPath: string;
  outputPath: string;
}

export class VideoAssembler {
  private ffmpegProcess: ffmpeg.FfmpegCommand | null = null;
  private videoStream: PassThrough | null = null;

  public start(settings: RenderSettings, onProgress: (percent: number) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.videoStream = new PassThrough();

      // The FFmpeg command: Accepts raw RGBA pixels via stdin
      this.ffmpegProcess = ffmpeg()
        .input(this.videoStream)
        .inputOptions([
          '-f rawvideo',
          '-pix_fmt rgba',
          `-s ${settings.width}x${settings.height}`,
          `-r ${settings.fps}`,
        ])
        .input(settings.audioPath)
        .videoCodec(settings.codec)
        .outputOptions([
          '-preset slow',      // High-quality mechanical encoding
          '-crf 18',           // Visually lossless quality for YouTube
          '-pix_fmt yuv420p',   // Maximum compatibility across players
          '-shortest',         // Match video duration to audio duration
        ])
        .audioCodec('aac')
        .audioBitrate('320k')
        .output(settings.outputPath)
        .on('progress', (progress) => {
          if (progress.percent != null && !isNaN(progress.percent)) {
            onProgress(progress.percent);
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));

      this.ffmpegProcess.run();
    });
  }

  // Called for every single frame extracted from the headless WebGL renderer
  public writeFrame(rawPixelBuffer: Buffer): void {
    if (this.videoStream && !this.videoStream.destroyed) {
      this.videoStream.write(rawPixelBuffer);
    }
  }

  public finish(): void {
    if (this.videoStream && !this.videoStream.destroyed) {
      this.videoStream.end();
    }
  }
}
