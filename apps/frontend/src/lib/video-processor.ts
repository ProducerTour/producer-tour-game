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
   * Build FFmpeg arguments optimized for speed
   * Key optimizations:
   * - Static images: output at 1fps (30x fewer frames to encode)
   * - Higher CRF (28) for faster encoding with acceptable quality
   * - -tune stillimage for static content optimization
   */
  private buildFFmpegArgs(
    isAnimated: boolean,
    duration: number,
    scaleFilter: string,
    imageExt: string
  ): string[] {
    if (isAnimated) {
      // For GIF/MP4 (animated) - keep higher framerate for smooth animation
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
        '-crf',
        '28', // Faster encoding, slightly lower quality (default is 23)
        '-vf',
        `fps=24,${scaleFilter}`, // Reduced from 30fps to 24fps
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
      // For static images (PNG/JPG) - OPTIMIZED for speed
      // Key: output at 1fps since image doesn't change (massive speedup)
      return [
        '-y',
        '-loop',
        '1',
        '-framerate',
        '1', // Input at 1fps
        '-i',
        `image.${imageExt}`,
        '-i',
        'beat.mp3',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'stillimage', // Optimize encoding for static content
        '-crf',
        '28', // Faster encoding with acceptable quality
        '-t',
        duration.toString(),
        '-vf',
        scaleFilter,
        '-r',
        '15', // Output at 15fps - 2x faster than 30fps while staying YouTube compatible
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
