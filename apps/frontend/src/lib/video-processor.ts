import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { parseBlob } from 'music-metadata-browser';
import type { ProcessingJob, VideoResolution, VideoQuality } from '../types/video-maker';
import { RESOLUTION_CONFIG, QUALITY_PRESETS } from '../types/video-maker';
import { getImageType } from './file-pairing';

export interface ProcessorOptions {
  resolution: VideoResolution;
  quality: VideoQuality;
}

/**
 * Video Processor - Replicates Python tool's FFmpeg logic
 */
export class VideoProcessor {
  private ffmpeg: FFmpeg;
  private options: ProcessorOptions;

  constructor(ffmpeg: FFmpeg, options?: Partial<ProcessorOptions>) {
    this.ffmpeg = ffmpeg;
    this.options = {
      resolution: options?.resolution || '720p',
      quality: options?.quality || 'balanced',
    };
  }

  /**
   * Process a single job (beat + image → video)
   */
  async processJob(job: ProcessingJob): Promise<Blob> {
    console.log(`[VideoProcessor] Processing ${job.outputName} at ${this.options.resolution}, quality: ${this.options.quality}`);

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
   * Get scale filter based on format and resolution settings
   */
  private getScaleFilter(format: '16x9' | '9x16'): string {
    const resConfig = RESOLUTION_CONFIG[this.options.resolution];
    const dims = format === '16x9' ? resConfig.landscape : resConfig.portrait;
    const { width, height } = dims;

    // Scale with padding to maintain aspect ratio
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
  }

  /**
   * Build FFmpeg arguments with configurable quality
   * Key optimizations:
   * - Static images: output at lower fps since image doesn't change
   * - CRF based on quality setting for encoding speed vs quality tradeoff
   * - -tune stillimage for static content optimization
   */
  private buildFFmpegArgs(
    isAnimated: boolean,
    duration: number,
    scaleFilter: string,
    imageExt: string
  ): string[] {
    const crf = QUALITY_PRESETS[this.options.quality].crf.toString();

    // Framerate based on quality - higher quality = more frames
    const outputFps = this.options.quality === 'high' ? '24' : this.options.quality === 'balanced' ? '15' : '10';
    const animatedFps = this.options.quality === 'high' ? '30' : '24';

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
        crf,
        '-vf',
        `fps=${animatedFps},${scaleFilter}`,
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
      // Key: output at lower fps since image doesn't change (massive speedup)
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
        crf,
        '-t',
        duration.toString(),
        '-vf',
        scaleFilter,
        '-r',
        outputFps,
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
