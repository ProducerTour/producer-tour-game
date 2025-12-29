import axios from 'axios';
import { getAuthToken } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AudioDBArtist {
  id: string;
  name: string;
  genre?: string;
  style?: string;
  formed?: string;
  thumbnail?: string;
  logo?: string;
  fanart?: string;
  country?: string;
  biography?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  musicbrainzId?: string;
}

export interface AudioDBAlbum {
  id: string;
  artistId: string;
  name: string;
  artist: string;
  year?: string;
  genre?: string;
  style?: string;
  label?: string;
  thumbnail?: string;
  thumbnailHQ?: string;
  cdArt?: string;
  description?: string;
  score?: number;
  musicbrainzId?: string;
  discogsId?: string;
}

export interface AudioDBTrack {
  id: string;
  albumId: string;
  artistId: string;
  name: string;
  album: string;
  artist: string;
  duration?: number;
  genre?: string;
  thumbnail?: string;
  musicbrainzId?: string;
}

export interface EnrichedPlacementData {
  artist: AudioDBArtist | null;
  album: AudioDBAlbum | null;
  track: AudioDBTrack | null;
}

class AudioDBAPI {
  private getAuthHeaders() {
    const token = getAuthToken();
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async searchArtist(query: string): Promise<AudioDBArtist[]> {
    try {
      const response = await axios.get(`${API_URL}/api/audiodb/search/artist`, {
        params: { q: query },
        headers: this.getAuthHeaders(),
      });
      return response.data.artists || [];
    } catch (error) {
      console.error('AudioDB searchArtist error:', error);
      return [];
    }
  }

  async searchAlbum(artist: string, album: string): Promise<AudioDBAlbum[]> {
    try {
      const response = await axios.get(`${API_URL}/api/audiodb/search/album`, {
        params: { artist, album },
        headers: this.getAuthHeaders(),
      });
      return response.data.albums || [];
    } catch (error) {
      console.error('AudioDB searchAlbum error:', error);
      return [];
    }
  }

  async searchTrack(artist: string, track: string): Promise<AudioDBTrack[]> {
    try {
      const response = await axios.get(`${API_URL}/api/audiodb/search/track`, {
        params: { artist, track },
        headers: this.getAuthHeaders(),
      });
      return response.data.tracks || [];
    } catch (error) {
      console.error('AudioDB searchTrack error:', error);
      return [];
    }
  }

  async getArtist(artistId: string): Promise<AudioDBArtist | null> {
    try {
      const response = await axios.get(`${API_URL}/api/audiodb/artist/${artistId}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.artist || null;
    } catch (error) {
      console.error('AudioDB getArtist error:', error);
      return null;
    }
  }

  async getArtistAlbums(artistId: string): Promise<AudioDBAlbum[]> {
    try {
      const response = await axios.get(`${API_URL}/api/audiodb/artist/${artistId}/albums`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.albums || [];
    } catch (error) {
      console.error('AudioDB getArtistAlbums error:', error);
      return [];
    }
  }

  async enrichPlacementData(
    artist: string,
    title?: string,
    albumName?: string
  ): Promise<EnrichedPlacementData> {
    try {
      const response = await axios.post(
        `${API_URL}/api/audiodb/enrich`,
        { artist, title, albumName },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('AudioDB enrichPlacementData error:', error);
      return { artist: null, album: null, track: null };
    }
  }
}

export const audiodbApi = new AudioDBAPI();
