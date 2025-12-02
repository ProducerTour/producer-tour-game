/**
 * Spotify Web API Service
 * Handles authentication and track lookup via Spotify API
 */

import axios, { AxiosInstance } from 'axios';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    name: string;
    id: string;
  }>;
  album: {
    name: string;
    release_date: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  external_ids: {
    isrc?: string;
  };
  preview_url: string | null;
  explicit: boolean;
  duration_ms: number;
  popularity: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

interface SpotifyArtistSearchResponse {
  artists: {
    items: SpotifyArtist[];
    total: number;
  };
}

class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private enabled: boolean;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseURL = 'https://api.spotify.com/v1';
  private authURL = 'https://accounts.spotify.com/api/token';
  private axiosInstance: AxiosInstance;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.enabled = Boolean(this.clientId && this.clientSecret);

    if (!this.enabled) {
      console.warn(
        'SpotifyService: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET were not found. ' +
          'Spotify lookup features will be disabled until these environment variables are set.'
      );
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
    });
  }

  isEnabled() {
    return this.enabled;
  }

  private assertEnabled() {
    if (!this.enabled) {
      throw new Error('Spotify integration is disabled. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable it.');
    }
  }

  /**
   * Get or refresh Spotify access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    this.assertEnabled();

    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(this.authURL, 'grant_type=client_credentials', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
      });

      this.accessToken = response.data.access_token;
      // Token expires in 3600 seconds, refresh at 90% of that time
      this.tokenExpiry = Date.now() + response.data.expires_in * 900;

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw new Error('Failed to authenticate with Spotify API');
    }
  }

  /**
   * Search for tracks by query string
   * Supports: track name, artist, album, ISRC code
   */
  async searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.axiosInstance.get<SpotifySearchResponse>('/search', {
        params: {
          q: query,
          type: 'track',
          limit: Math.min(limit, 50), // Spotify max is 50
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.tracks.items;
    } catch (error) {
      console.error('Spotify search error:', error);
      throw new Error('Failed to search Spotify tracks');
    }
  }

  /**
   * Get track details by ISRC code
   */
  async getTrackByISRC(isrc: string): Promise<SpotifyTrack | null> {
    try {
      const tracks = await this.searchTracks(`isrc:${isrc}`, 1);
      return tracks.length > 0 ? tracks[0] : null;
    } catch (error) {
      console.error('ISRC lookup error:', error);
      throw new Error('Failed to lookup ISRC code');
    }
  }

  /**
   * Get track details by track ID
   */
  async getTrackById(trackId: string): Promise<SpotifyTrack> {
    try {
      const token = await this.getAccessToken();

      const response = await this.axiosInstance.get<SpotifyTrack>(`/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Spotify track lookup error:', error);
      throw new Error('Failed to get track details');
    }
  }

  /**
   * Get multiple tracks by IDs
   */
  async getMultipleTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      // Spotify allows up to 50 tracks per request
      const response = await this.axiosInstance.get<{ tracks: SpotifyTrack[] }>('/tracks', {
        params: {
          ids: trackIds.slice(0, 50).join(','),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.tracks.filter(Boolean); // Filter out null values for invalid IDs
    } catch (error) {
      console.error('Spotify multiple tracks lookup error:', error);
      throw new Error('Failed to get track details');
    }
  }

  /**
   * Search for artists by name
   */
  async searchArtists(query: string, limit: number = 10): Promise<SpotifyArtist[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.axiosInstance.get<SpotifyArtistSearchResponse>('/search', {
        params: {
          q: query,
          type: 'artist',
          limit: Math.min(limit, 50),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.artists.items;
    } catch (error) {
      console.error('Spotify artist search error:', error);
      throw new Error('Failed to search Spotify artists');
    }
  }

  /**
   * Get artist by Spotify ID
   */
  async getArtistById(artistId: string): Promise<SpotifyArtist> {
    try {
      const token = await this.getAccessToken();

      const response = await this.axiosInstance.get<SpotifyArtist>(`/artists/${artistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Spotify artist lookup error:', error);
      throw new Error('Failed to get artist details');
    }
  }

  /**
   * Format artist data for frontend
   */
  formatArtistData(artist: SpotifyArtist) {
    return {
      id: artist.id,
      name: artist.name,
      image: artist.images[0]?.url || null,
      imageLarge: artist.images[0]?.url || null,
      imageMedium: artist.images[1]?.url || null,
      imageSmall: artist.images[2]?.url || null,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      spotifyUrl: artist.external_urls.spotify,
    };
  }

  /**
   * Format track data for frontend consumption
   */
  formatTrackData(track: SpotifyTrack) {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      releaseDate: track.album.release_date,
      isrc: track.external_ids.isrc || null,
      preview: track.preview_url,
      explicit: track.explicit,
      duration: track.duration_ms,
      popularity: track.popularity,
      image: track.album.images[0]?.url || null,
      spotifyUrl: `https://open.spotify.com/track/${track.id}`,
    };
  }

  /**
   * Format track data for landing page hit songs carousel
   */
  formatForLandingPage(track: SpotifyTrack, producerName: string) {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      producer: producerName,
      coverArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      spotifyUrl: `https://open.spotify.com/track/${track.id}`,
      popularity: track.popularity,
    };
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();
export default SpotifyService;
