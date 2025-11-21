import axios, { AxiosInstance } from 'axios';

interface GeniusSearchResult {
  id: number;
  title: string;
  primary_artist: {
    name: string;
  };
  url: string;
}

interface GeniusSongDetails {
  id: number;
  title: string;
  primary_artist: {
    name: string;
  };
  producer_artists: Array<{
    name: string;
    id: number;
  }>;
  writer_artists: Array<{
    name: string;
    id: number;
  }>;
}

class GeniusService {
  private axiosInstance: AxiosInstance;
  private accessToken: string;
  private enabled: boolean;

  constructor() {
    this.accessToken = process.env.GENIUS_ACCESS_TOKEN || '';
    this.enabled = !!this.accessToken;

    if (!this.enabled) {
      console.warn(
        'GeniusService: GENIUS_ACCESS_TOKEN was not found. ' +
          'Producer credit lookups will be disabled.'
      );
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://api.genius.com',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Search for a song on Genius
   */
  async searchSong(query: string): Promise<GeniusSearchResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.axiosInstance.get('/search', {
        params: { q: query },
      });

      const hits = response.data.response.hits;
      if (hits && hits.length > 0) {
        return hits[0].result as GeniusSearchResult;
      }
      return null;
    } catch (error) {
      console.error('Genius search error:', error);
      return null;
    }
  }

  /**
   * Get song details including producer credits
   */
  async getSongDetails(songId: number): Promise<GeniusSongDetails | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.axiosInstance.get(`/songs/${songId}`);
      return response.data.response.song as GeniusSongDetails;
    } catch (error) {
      console.error('Genius song details error:', error);
      return null;
    }
  }

  /**
   * Get producer names for a song by searching title + artist
   */
  async getProducerCredits(title: string, artist: string): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      // Search for the song
      const searchResult = await this.searchSong(`${title} ${artist}`);
      if (!searchResult) {
        return [];
      }

      // Get detailed song info including producer credits
      const songDetails = await this.getSongDetails(searchResult.id);
      if (!songDetails || !songDetails.producer_artists) {
        return [];
      }

      return songDetails.producer_artists.map((p) => p.name);
    } catch (error) {
      console.error('Error getting producer credits:', error);
      return [];
    }
  }

  /**
   * Format producers list to a display string
   */
  formatProducers(producers: string[]): string {
    if (producers.length === 0) {
      return 'Producer Tour Member';
    }
    if (producers.length === 1) {
      return producers[0];
    }
    if (producers.length === 2) {
      return producers.join(' & ');
    }
    // For 3+ producers, show first 2 and "+ X more"
    return `${producers.slice(0, 2).join(', ')} + ${producers.length - 2} more`;
  }
}

// Export singleton instance
export const geniusService = new GeniusService();
export default GeniusService;
