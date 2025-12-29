/**
 * Video Storage System - Stores videos in IndexedDB for up to 24 hours
 */

const DB_NAME = 'VideoMakerDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const EXPIRY_HOURS = 24;

export interface StoredVideo {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
  expiresAt: number;
  format: '16x9' | '9x16';
  size: number;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    privacy?: string;
  };
}

export interface StoredVideoWithUrl extends StoredVideo {
  url: string;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
  });
}

/**
 * Save a video to IndexedDB
 */
export async function saveVideo(video: Omit<StoredVideo, 'createdAt' | 'expiresAt'>): Promise<StoredVideo> {
  const db = await openDB();

  const now = Date.now();
  const storedVideo: StoredVideo = {
    ...video,
    createdAt: now,
    expiresAt: now + (EXPIRY_HOURS * 60 * 60 * 1000),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(storedVideo);

    request.onerror = () => {
      reject(new Error('Failed to save video'));
    };

    request.onsuccess = () => {
      resolve(storedVideo);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all stored videos (excluding expired ones)
 */
export async function getAllVideos(): Promise<StoredVideoWithUrl[]> {
  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error('Failed to get videos'));
    };

    request.onsuccess = () => {
      const videos = request.result as StoredVideo[];

      // Filter out expired videos and add blob URLs
      const validVideos = videos
        .filter((video) => video.expiresAt > now)
        .map((video) => ({
          ...video,
          url: URL.createObjectURL(video.blob),
        }));

      resolve(validVideos);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a single video by ID
 */
export async function getVideo(id: string): Promise<StoredVideoWithUrl | null> {
  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => {
      reject(new Error('Failed to get video'));
    };

    request.onsuccess = () => {
      const video = request.result as StoredVideo | undefined;

      if (!video || video.expiresAt <= now) {
        resolve(null);
      } else {
        resolve({
          ...video,
          url: URL.createObjectURL(video.blob),
        });
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a video by ID
 */
export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error('Failed to delete video'));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete multiple videos by IDs
 */
export async function deleteVideos(ids: string[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let completed = 0;
    let hasError = false;

    ids.forEach((id) => {
      const request = store.delete(id);

      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(new Error('Failed to delete videos'));
        }
      };

      request.onsuccess = () => {
        completed++;
        if (completed === ids.length && !hasError) {
          resolve();
        }
      };
    });

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Update video metadata
 */
export async function updateVideoMetadata(
  id: string,
  metadata: StoredVideo['metadata']
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onerror = () => {
      reject(new Error('Failed to get video'));
    };

    getRequest.onsuccess = () => {
      const video = getRequest.result as StoredVideo | undefined;
      if (!video) {
        reject(new Error('Video not found'));
        return;
      }

      const updatedVideo: StoredVideo = {
        ...video,
        metadata,
      };

      const putRequest = store.put(updatedVideo);

      putRequest.onerror = () => {
        reject(new Error('Failed to update video metadata'));
      };

      putRequest.onsuccess = () => {
        resolve();
      };
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clean up expired videos
 */
export async function cleanupExpiredVideos(): Promise<number> {
  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error('Failed to get videos for cleanup'));
    };

    request.onsuccess = () => {
      const videos = request.result as StoredVideo[];
      const expiredIds = videos
        .filter((video) => video.expiresAt <= now)
        .map((video) => video.id);

      let deleted = 0;

      if (expiredIds.length === 0) {
        resolve(0);
        return;
      }

      expiredIds.forEach((id) => {
        const deleteRequest = store.delete(id);

        deleteRequest.onsuccess = () => {
          deleted++;
          if (deleted === expiredIds.length) {
            resolve(deleted);
          }
        };
      });
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalVideos: number;
  totalSize: number;
  oldestVideo: number | null;
  newestVideo: number | null;
}> {
  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error('Failed to get storage stats'));
    };

    request.onsuccess = () => {
      const videos = (request.result as StoredVideo[]).filter(
        (video) => video.expiresAt > now
      );

      const totalSize = videos.reduce((sum, video) => sum + video.size, 0);
      const timestamps = videos.map((video) => video.createdAt);

      resolve({
        totalVideos: videos.length,
        totalSize,
        oldestVideo: timestamps.length > 0 ? Math.min(...timestamps) : null,
        newestVideo: timestamps.length > 0 ? Math.max(...timestamps) : null,
      });
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format time remaining until expiry
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
