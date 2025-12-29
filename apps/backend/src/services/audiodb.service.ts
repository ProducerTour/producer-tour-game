import axios from 'axios';

/**
 * AudioDB API Service
 * Integrates with TheAudioDB.com free API for music metadata
 * API Key: 2 (free tier)
 * Docs: https://www.theaudiodb.com/free_music_api
 */

const AUDIODB_BASE_URL = 'https://www.theaudiodb.com/api/v1/json/2';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// In-memory cache to avoid rate limits
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AudioDBCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new AudioDBCache();

// API Response Types
export interface AudioDBArtist {
  idArtist: string;
  strArtist: string;
  strArtistAlternate?: string;
  strLabel?: string;
  idLabel?: string;
  intFormedYear?: string;
  intBornYear?: string;
  intDiedYear?: string;
  strDisbanded?: string;
  strStyle?: string;
  strGenre?: string;
  strMood?: string;
  strWebsite?: string;
  strFacebook?: string;
  strTwitter?: string;
  strBiographyEN?: string;
  strBiographyDE?: string;
  strBiographyFR?: string;
  strBiographyCN?: string;
  strBiographyIT?: string;
  strBiographyJP?: string;
  strBiographyRU?: string;
  strBiographyES?: string;
  strBiographyPT?: string;
  strBiographySE?: string;
  strGender?: string;
  intMembers?: string;
  strCountry?: string;
  strCountryCode?: string;
  strArtistThumb?: string;
  strArtistLogo?: string;
  strArtistCutout?: string;
  strArtistClearart?: string;
  strArtistWideThumb?: string;
  strArtistFanart?: string;
  strArtistFanart2?: string;
  strArtistFanart3?: string;
  strArtistFanart4?: string;
  strArtistBanner?: string;
  strMusicBrainzID?: string;
  strISNIcode?: string;
  strLastFMChart?: string;
  intCharted?: string;
  strLocked?: string;
}

export interface AudioDBAlbum {
  idAlbum: string;
  idArtist: string;
  idLabel?: string;
  strAlbum: string;
  strAlbumStripped?: string;
  strArtist: string;
  strArtistStripped?: string;
  intYearReleased?: string;
  strStyle?: string;
  strGenre?: string;
  strLabel?: string;
  strReleaseFormat?: string;
  intSales?: string;
  strAlbumThumb?: string;
  strAlbumThumbHQ?: string;
  strAlbumThumbBack?: string;
  strAlbumCDart?: string;
  strAlbumSpine?: string;
  strAlbum3DCase?: string;
  strAlbum3DFlat?: string;
  strAlbum3DFace?: string;
  strAlbum3DThumb?: string;
  strDescriptionEN?: string;
  strDescriptionDE?: string;
  strDescriptionFR?: string;
  strDescriptionCN?: string;
  strDescriptionIT?: string;
  strDescriptionJP?: string;
  strDescriptionRU?: string;
  strDescriptionES?: string;
  strDescriptionPT?: string;
  strDescriptionSE?: string;
  intLoved?: string;
  intScore?: string;
  intScoreVotes?: string;
  strReview?: string;
  strMood?: string;
  strTheme?: string;
  strSpeed?: string;
  strLocation?: string;
  strMusicBrainzID?: string;
  strMusicBrainzArtistID?: string;
  strAllMusicID?: string;
  strBBCReviewID?: string;
  strRateYourMusicID?: string;
  strDiscogsID?: string;
  strWikidataID?: string;
  strWikipediaID?: string;
  strGeniusID?: string;
  strLyricWikiID?: string;
  strMusicMozID?: string;
  strItunesID?: string;
  strAmazonID?: string;
  strLocked?: string;
}

export interface AudioDBTrack {
  idTrack: string;
  idAlbum: string;
  idArtist: string;
  idLyric?: string;
  idIMVDB?: string;
  strTrack: string;
  strAlbum: string;
  strArtist: string;
  strArtistAlternate?: string;
  intCD?: string;
  intDuration?: string;
  strGenre?: string;
  strMood?: string;
  strStyle?: string;
  strTheme?: string;
  strDescriptionEN?: string;
  strTrackThumb?: string;
  strTrack3x3?: string;
  strTrackLyrics?: string;
  strMusicVid?: string;
  strMusicVidDirector?: string;
  strMusicVidCompany?: string;
  strMusicVidScreen1?: string;
  strMusicVidScreen2?: string;
  strMusicVidScreen3?: string;
  intMusicVidViews?: string;
  intMusicVidLikes?: string;
  intMusicVidDislikes?: string;
  intMusicVidFavorites?: string;
  intMusicVidComments?: string;
  intTrackNumber?: string;
  intLoved?: string;
  intScore?: string;
  intScoreVotes?: string;
  strMusicBrainzID?: string;
  strMusicBrainzAlbumID?: string;
  strMusicBrainzArtistID?: string;
  strLocked?: string;
}

// Simplified types for frontend consumption
export interface SimplifiedArtist {
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

export interface SimplifiedAlbum {
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
  spotifyId?: string;
}

export interface SimplifiedTrack {
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
  artist: SimplifiedArtist | null;
  album: SimplifiedAlbum | null;
  track: SimplifiedTrack | null;
}

class AudioDBService {
  /**
   * Search for artists by name
   */
  async searchArtist(artistName: string): Promise<SimplifiedArtist[]> {
    const cacheKey = `artist:${artistName.toLowerCase()}`;
    const cached = cache.get<SimplifiedArtist[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${AUDIODB_BASE_URL}/search.php`, {
        params: { s: artistName },
        timeout: 5000,
      });

      const artists: AudioDBArtist[] = response.data?.artists || [];
      const simplified = artists.map(this.simplifyArtist);

      cache.set(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('AudioDB searchArtist error:', error);
      return [];
    }
  }

  /**
   * Get artist details by ID
   */
  async getArtist(artistId: string): Promise<SimplifiedArtist | null> {
    const cacheKey = `artist:id:${artistId}`;
    const cached = cache.get<SimplifiedArtist | null>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${AUDIODB_BASE_URL}/artist.php`, {
        params: { i: artistId },
        timeout: 5000,
      });

      const artists: AudioDBArtist[] = response.data?.artists || [];
      if (artists.length === 0) return null;

      const simplified = this.simplifyArtist(artists[0]);
      cache.set(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('AudioDB getArtist error:', error);
      return null;
    }
  }

  /**
   * Search for albums by artist and album name
   */
  async searchAlbum(artistName: string, albumName: string): Promise<SimplifiedAlbum[]> {
    const cacheKey = `album:${artistName.toLowerCase()}:${albumName.toLowerCase()}`;
    const cached = cache.get<SimplifiedAlbum[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${AUDIODB_BASE_URL}/searchalbum.php`, {
        params: { s: artistName, a: albumName },
        timeout: 5000,
      });

      const albums: AudioDBAlbum[] = response.data?.album || [];
      const simplified = albums.map(this.simplifyAlbum);

      cache.set(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('AudioDB searchAlbum error:', error);
      return [];
    }
  }

  /**
   * Get all albums by artist ID
   */
  async getAlbumsByArtist(artistId: string): Promise<SimplifiedAlbum[]> {
    const cacheKey = `albums:artist:${artistId}`;
    const cached = cache.get<SimplifiedAlbum[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${AUDIODB_BASE_URL}/album.php`, {
        params: { i: artistId },
        timeout: 5000,
      });

      const albums: AudioDBAlbum[] = response.data?.album || [];
      const simplified = albums.map(this.simplifyAlbum);

      cache.set(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('AudioDB getAlbumsByArtist error:', error);
      return [];
    }
  }

  /**
   * Search for a track by artist and track name
   */
  async searchTrack(artistName: string, trackName: string): Promise<SimplifiedTrack[]> {
    const cacheKey = `track:${artistName.toLowerCase()}:${trackName.toLowerCase()}`;
    const cached = cache.get<SimplifiedTrack[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${AUDIODB_BASE_URL}/searchtrack.php`, {
        params: { s: artistName, t: trackName },
        timeout: 5000,
      });

      const tracks: AudioDBTrack[] = response.data?.track || [];
      const simplified = tracks.map(this.simplifyTrack);

      cache.set(cacheKey, simplified);
      return simplified;
    } catch (error) {
      console.error('AudioDB searchTrack error:', error);
      return [];
    }
  }

  /**
   * Enrich placement data with AudioDB metadata
   * This is the main method to use when adding/editing placements
   */
  async enrichPlacementData(
    artistName: string,
    trackTitle?: string,
    albumName?: string
  ): Promise<EnrichedPlacementData> {
    const result: EnrichedPlacementData = {
      artist: null,
      album: null,
      track: null,
    };

    try {
      // Search for artist
      const artists = await this.searchArtist(artistName);
      if (artists.length > 0) {
        result.artist = artists[0]; // Take first match

        // If album name provided, search for album
        if (albumName && result.artist) {
          const albums = await this.searchAlbum(artistName, albumName);
          if (albums.length > 0) {
            result.album = albums[0];
          }
        }

        // If track title provided, search for track
        if (trackTitle) {
          const tracks = await this.searchTrack(artistName, trackTitle);
          if (tracks.length > 0) {
            result.track = tracks[0];
          }
        }
      }
    } catch (error) {
      console.error('AudioDB enrichPlacementData error:', error);
    }

    return result;
  }

  /**
   * Convert full AudioDB artist to simplified format
   */
  private simplifyArtist(artist: AudioDBArtist): SimplifiedArtist {
    return {
      id: artist.idArtist,
      name: artist.strArtist,
      genre: artist.strGenre || undefined,
      style: artist.strStyle || undefined,
      formed: artist.intFormedYear || undefined,
      thumbnail: artist.strArtistThumb || undefined,
      logo: artist.strArtistLogo || undefined,
      fanart: artist.strArtistFanart || undefined,
      country: artist.strCountry || undefined,
      biography: artist.strBiographyEN || undefined,
      website: artist.strWebsite || undefined,
      facebook: artist.strFacebook || undefined,
      twitter: artist.strTwitter || undefined,
      musicbrainzId: artist.strMusicBrainzID || undefined,
    };
  }

  /**
   * Convert full AudioDB album to simplified format
   */
  private simplifyAlbum(album: AudioDBAlbum): SimplifiedAlbum {
    return {
      id: album.idAlbum,
      artistId: album.idArtist,
      name: album.strAlbum,
      artist: album.strArtist,
      year: album.intYearReleased || undefined,
      genre: album.strGenre || undefined,
      style: album.strStyle || undefined,
      label: album.strLabel || undefined,
      thumbnail: album.strAlbumThumb || undefined,
      thumbnailHQ: album.strAlbumThumbHQ || undefined,
      cdArt: album.strAlbumCDart || undefined,
      description: album.strDescriptionEN || undefined,
      score: album.intScore ? parseInt(album.intScore) : undefined,
      musicbrainzId: album.strMusicBrainzID || undefined,
      discogsId: album.strDiscogsID || undefined,
    };
  }

  /**
   * Convert full AudioDB track to simplified format
   */
  private simplifyTrack(track: AudioDBTrack): SimplifiedTrack {
    return {
      id: track.idTrack,
      albumId: track.idAlbum,
      artistId: track.idArtist,
      name: track.strTrack,
      album: track.strAlbum,
      artist: track.strArtist,
      duration: track.intDuration ? parseInt(track.intDuration) : undefined,
      genre: track.strGenre || undefined,
      thumbnail: track.strTrackThumb || undefined,
      musicbrainzId: track.strMusicBrainzID || undefined,
    };
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    cache.clear();
  }
}

export default new AudioDBService();
