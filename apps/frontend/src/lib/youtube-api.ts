const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface YouTubeAuthStatus {
  authenticated: boolean;
  channel?: {
    id: string;
    title: string;
    thumbnail?: string;
  };
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnail?: string;
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

export interface YouTubeUploadMetadata {
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: 'public' | 'private' | 'unlisted';
  categoryId?: string;
}

export interface YouTubeUploadResponse {
  id: string;
  title: string;
  url: string;
  privacyStatus: string;
}

/**
 * Get YouTube OAuth authorization URL
 */
export async function getAuthUrl(): Promise<string> {
  const response = await fetch(`${API_URL}/api/youtube/auth/url`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to get authorization URL');
  }

  return data.authUrl;
}

/**
 * Check if user is authenticated with YouTube
 */
export async function checkAuthStatus(): Promise<YouTubeAuthStatus> {
  const response = await fetch(`${API_URL}/api/youtube/auth/status`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to check auth status');
  }

  return {
    authenticated: data.authenticated,
    channel: data.channel
  };
}

/**
 * Revoke YouTube authentication
 */
export async function revokeAuth(): Promise<void> {
  const response = await fetch(`${API_URL}/api/youtube/auth/revoke`, {
    method: 'POST'
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to revoke authentication');
  }
}

/**
 * Get YouTube channel information
 */
export async function getChannelInfo(): Promise<YouTubeChannel> {
  const response = await fetch(`${API_URL}/api/youtube/channel`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to get channel info');
  }

  return data.channel;
}

/**
 * Upload video to YouTube
 */
export async function uploadVideo(
  videoBlob: Blob,
  filename: string,
  metadata: YouTubeUploadMetadata,
  onProgress?: (progress: number) => void
): Promise<YouTubeUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);
    formData.append('title', metadata.title);

    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    if (metadata.tags && metadata.tags.length > 0) {
      formData.append('tags', metadata.tags.join(','));
    }

    if (metadata.privacyStatus) {
      formData.append('privacyStatus', metadata.privacyStatus);
    }

    if (metadata.categoryId) {
      formData.append('categoryId', metadata.categoryId);
    }

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.video);
          } else {
            reject(new Error(data.message || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.message || 'Upload failed'));
        } catch (error) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Send request
    xhr.open('POST', `${API_URL}/api/youtube/upload`);
    xhr.send(formData);
  });
}

/**
 * Open YouTube OAuth in a popup window
 * This preserves the current page state
 */
export async function authorizeYouTube(): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get auth URL from backend
      const authUrl = await getAuthUrl();

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'YouTube Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error('Failed to open popup window. Please allow popups for this site.'));
        return;
      }

      let authCompleted = false;
      let checkInterval: NodeJS.Timeout;
      let timeoutId: NodeJS.Timeout;

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'youtube-auth-success') {
          authCompleted = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          resolve(true);
        } else if (event.data.type === 'youtube-auth-error') {
          authCompleted = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.message || 'Authentication failed'));
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: Poll auth status in case postMessage fails
      // This handles the case where popup closes before message is sent
      checkInterval = setInterval(async () => {
        try {
          // Don't check popup.closed due to COOP policy - just poll auth status
          const status = await checkAuthStatus();
          if (status.authenticated && !authCompleted) {
            authCompleted = true;
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleMessage);
            resolve(true);
          }
        } catch (error) {
          // Ignore errors during polling
        }
      }, 1000);

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        if (!authCompleted) {
          clearInterval(checkInterval);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Authentication timeout - please try again'));
        }
      }, 300000);
    } catch (error) {
      console.error('Authorization error:', error);
      reject(error);
    }
  });
}
