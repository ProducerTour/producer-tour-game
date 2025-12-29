import type { FilePair } from '../types/video-maker';

/**
 * Pair beats with images sequentially (matches Python tool logic)
 * Sorts files alphabetically and pairs by index
 */
export function pairFiles(beats: File[], images: File[]): FilePair[] {
  // Sort files alphabetically (case-insensitive)
  const sortedBeats = [...beats].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  const sortedImages = [...images].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Pair by index
  const minLength = Math.min(sortedBeats.length, sortedImages.length);
  const pairs: FilePair[] = [];

  for (let i = 0; i < minLength; i++) {
    pairs.push({
      beat: sortedBeats[i],
      image: sortedImages[i],
      beatName: sortedBeats[i].name.replace(/\.mp3$/i, ''),
    });
  }

  return pairs;
}

/**
 * Validate uploaded files
 */
export function validateFiles(files: File[], type: 'audio' | 'image'): string[] {
  const errors: string[] = [];

  const validExtensions =
    type === 'audio' ? ['.mp3'] : ['.png', '.jpg', '.jpeg', '.gif', '.mp4'];

  const maxSize = type === 'audio' ? 50 * 1024 * 1024 : 100 * 1024 * 1024; // 50MB / 100MB

  for (const file of files) {
    const ext = '.' + file.name.toLowerCase().split('.').pop();

    if (!validExtensions.includes(ext)) {
      errors.push(
        `${file.name}: Invalid file type. Expected ${validExtensions.join(', ')}`
      );
    }

    if (file.size > maxSize) {
      errors.push(
        `${file.name}: File too large. Max ${maxSize / 1024 / 1024}MB`
      );
    }
  }

  return errors;
}

/**
 * Determine if image is static or animated
 */
export function getImageType(file: File): 'static' | 'animated' {
  const extension = file.name.toLowerCase().split('.').pop();
  return ['gif', 'mp4'].includes(extension || '') ? 'animated' : 'static';
}
