import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { parseBlob } from 'music-metadata-browser';
import type { ProcessingJob } from '../types/video-maker';
import { getImageType } from './file-pairing';

/**
 * Video Processor - Replicates Python tool's FFmpeg logic
 */
export class VideoProcessor {
  private ffmpeg: FFmpeg;

  constructor(ffmpeg: FFmpeg) {
    this.ffmpeg = ffmpeg;
  }

  /**
   * Process a single job (beat + image → video)
   */
  async processJob(job: ProcessingJob): Promise<Blob> {
    console.log(`[VideoProcessor] Processing ${job.outputName}`);

    // Get audio duration
    const metadata = await parseBlob(job.beat);
    const duration = metadata.format.duration || 180; // Default 3 mins if can't read

    // Write files to FFmpeg filesystem
    const imageExt = job.image.name.split('.').pop()?.toLowerCase() || 'png';
    await this.ffmpeg.writeFile('beat.mp3', await fetchFile(job.beat));
    await this.ffmpeg.writeFile(`image.${imageExt}`, await fetchFile(job.image));

    // Determine image type
    const isAnimated = getImageType(job.image) === 'animated';

    // Get scale filter for format
    const scaleFilter = this.getScaleFilter(job.format);

    // Build FFmpeg arguments (matches Python tool exactly)
    const args = this.buildFFmpegArgs(isAnimated, duration, scaleFilter, imageExt);

    console.log('[VideoProcessor] FFmpeg args:', args.join(' '));

    // Execute FFmpeg
    await this.ffmpeg.exec(args);

    // Read output
    const data = await this.ffmpeg.readFile('output.mp4');

    // Clean up
    await this.cleanup();

    // Convert to Blob - handle FileData type (Uint8Array | string)
    // Use type assertion to bypass strict ArrayBuffer type checking
    return new Blob([data as BlobPart], { type: 'video/mp4' });
  }

  /**
   * Get scale filter based on format (matches Python tool)
   */
  private getScaleFilter(format: '16x9' | '9x16'): string {
    if (format === '16x9') {
      // 1280x720 with black padding
      return 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black';
    } else {
      // 720x1280 with black padding
      return 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black';
    }
  }

  /**
   * Build FFmpeg arguments (exact match to Python tool's video_processing.py)
   */
  private buildFFmpegArgs(
    isAnimated: boolean,
    duration: number,
    scaleFilter: string,
    imageExt: string
  ): string[] {
    if (isAnimated) {
      // For GIF/MP4 (animated)
      return [
        '-y',
        '-stream_loop',
        '-1',
        '-i',
        `image.${imageExt}`,
        '-i',
        'beat.mp3',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-vf',
        `fps=30,${scaleFilter}`,
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        '-movflags',
        '+faststart',
        '-profile:v',
        'main',
        '-pix_fmt',
        'yuv420p',
        'output.mp4',
      ];
    } else {
      // For static images (PNG/JPG)
      return [
        '-y',
        '-loop',
        '1',
        '-framerate',
        '1',
        '-i',
        `image.${imageExt}`,
        '-i',
        'beat.mp3',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-t',
        duration.toString(),
        '-vf',
        scaleFilter,
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        '-movflags',
        '+faststart',
        '-profile:v',
        'main',
        '-pix_fmt',
        'yuv420p',
        'output.mp4',
      ];
    }
  }

  /**
   * Clean up FFmpeg filesystem
   */
  private async cleanup(): Promise<void> {
    try {
      const files = ['beat.mp3', 'output.mp4'];
      // Try common image extensions
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'mp4'];

      for (const ext of imageExts) {
        files.push(`image.${ext}`);
      }

      for (const file of files) {
        try {
          await this.ffmpeg.deleteFile(file);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    } catch (err) {
      console.warn('[VideoProcessor] Cleanup warning:', err);
    }
  }
}
