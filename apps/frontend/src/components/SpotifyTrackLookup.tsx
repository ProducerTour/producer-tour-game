/**
 * Spotify Track Lookup Component
 *
 * Integrated component for searching and selecting tracks from Spotify.
 * Used in the Publishing Tracker for song lookup functionality.
 */

import React, { useState, useCallback } from 'react';
import { Music } from 'lucide-react';
import { toolsApi } from '@/lib/api';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseDate: string;
  isrc: string | null;
  preview: string | null;
  explicit: boolean;
  duration: number;
  popularity: number;
  image: string | null;
  spotifyUrl: string;
}

interface SpotifyTrackLookupProps {
  onTrackSelect?: (track: SpotifyTrack) => void;
  searchPlaceholder?: string;
  maxResults?: number;
  onClose?: () => void;
}

export const SpotifyTrackLookup: React.FC<SpotifyTrackLookupProps> = ({
  onTrackSelect,
  searchPlaceholder = 'Search by title, artist, album, or ISRC...',
  maxResults = 10,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isrcQuery, setIsrcQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'isrc'>('search');
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);

  // Handle general search
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await toolsApi.spotifySearch(searchQuery.trim(), maxResults);
      setResults(response.data.tracks || []);

      if (!response.data.tracks || response.data.tracks.length === 0) {
        setError('No tracks found. Try a different search term.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search tracks');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, maxResults]);

  // Handle ISRC lookup
  const handleISRCLookup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isrcQuery.trim()) {
      setError('Please enter an ISRC code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await toolsApi.spotifyLookupISRC(isrcQuery.trim());
      setResults([response.data.track]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'ISRC code not found');
      console.error('ISRC lookup error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [isrcQuery]);

  const handleTrackSelect = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    if (onTrackSelect) {
      onTrackSelect(track);
    }
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="spotify-track-lookup bg-surface rounded-xl border border-white/[0.08] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          Spotify Track Lookup
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/[0.08]">
        <button
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'search'
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'isrc'
              ? 'border-white text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('isrc')}
        >
          ISRC Lookup
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError('');
              }}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-2 bg-white hover:bg-white/90 disabled:bg-gray-600 disabled:text-gray-400 text-surface rounded-lg font-medium transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      )}

      {/* ISRC Lookup Tab */}
      {activeTab === 'isrc' && (
        <form onSubmit={handleISRCLookup} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter ISRC code (e.g., GBUM71001039)"
              value={isrcQuery}
              onChange={(e) => {
                setIsrcQuery(e.target.value);
                setError('');
              }}
              className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !isrcQuery.trim()}
              className="px-6 py-2 bg-white hover:bg-white/90 disabled:bg-gray-600 disabled:text-gray-400 text-surface rounded-lg font-medium transition-colors"
            >
              {loading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-sm font-medium mb-3">Results ({results.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {results.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedTrack?.id === track.id
                    ? 'border-white/30 bg-white/[0.08]'
                    : 'border-white/[0.08] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {/* Album Art */}
                {track.image && (
                  <img
                    src={track.image}
                    alt={track.title}
                    className="w-full aspect-square rounded-lg mb-3 object-cover border border-white/[0.08]"
                  />
                )}

                {/* Track Info */}
                <h5 className="text-white font-semibold text-sm mb-1 truncate">{track.title}</h5>
                <p className="text-gray-300 text-xs mb-2 truncate">{track.artist}</p>

                {/* Metadata */}
                <div className="text-xs text-gray-400 space-y-1 mb-3">
                  <p>{new Date(track.releaseDate).getFullYear()}</p>
                  <p>{formatDuration(track.duration)}</p>
                  <p>Popularity: {track.popularity}%</p>
                  {track.isrc && <p>ISRC: {track.isrc}</p>}
                </div>

                {/* Preview */}
                {track.preview && (
                  <audio
                    controls
                    className="w-full mb-3 h-6"
                    style={{ accentColor: '#ffffff' }}
                  >
                    <source src={track.preview} type="audio/mpeg" />
                  </audio>
                )}

                {/* Actions */}
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block w-full text-center px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg transition-colors"
                >
                  Open on Spotify →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Track Summary */}
      {selectedTrack && (
        <div className="p-4 bg-white/[0.08] border border-white/[0.15] rounded-xl">
          <h4 className="text-white font-semibold mb-3">Selected Track:</h4>
          <div className="flex gap-4">
            {selectedTrack.image && (
              <img
                src={selectedTrack.image}
                alt={selectedTrack.title}
                className="w-20 h-20 rounded-lg object-cover border border-white/[0.08]"
              />
            )}
            <div className="flex-1">
              <h5 className="text-white font-semibold">{selectedTrack.title}</h5>
              <p className="text-gray-300 text-sm">{selectedTrack.artist}</p>
              {selectedTrack.isrc && (
                <p className="text-gray-400 text-sm">ISRC: {selectedTrack.isrc}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {selectedTrack.album} • {new Date(selectedTrack.releaseDate).getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
