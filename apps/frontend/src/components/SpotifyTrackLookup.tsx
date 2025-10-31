/**
 * Spotify Track Lookup Component
 * 
 * Integrated component for searching and selecting tracks from Spotify.
 * Used in the Publishing Tracker for song lookup functionality.
 */

import React, { useState, useCallback } from 'react';
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
    <div className="spotify-track-lookup bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg font-semibold">🎵 Spotify Track Lookup</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'search'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'isrc'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
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
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
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
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !isrcQuery.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
            >
              {loading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <h4 className="text-slate-400 text-sm font-medium mb-3">Results ({results.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {results.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedTrack?.id === track.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-700 hover:border-blue-400'
                }`}
              >
                {/* Album Art */}
                {track.image && (
                  <img
                    src={track.image}
                    alt={track.title}
                    className="w-full aspect-square rounded-lg mb-3 object-cover"
                  />
                )}

                {/* Track Info */}
                <h5 className="text-white font-semibold text-sm mb-1 truncate">{track.title}</h5>
                <p className="text-slate-300 text-xs mb-2 truncate">{track.artist}</p>

                {/* Metadata */}
                <div className="text-xs text-slate-400 space-y-1 mb-3">
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
                    style={{ accentColor: '#2563eb' }}
                  >
                    <source src={track.preview} type="audio/mpeg" />
                  </audio>
                )}

                {/* Actions */}
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full text-center px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded transition"
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
        <div className="p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
          <h4 className="text-white font-semibold mb-3">Selected Track:</h4>
          <div className="flex gap-4">
            {selectedTrack.image && (
              <img
                src={selectedTrack.image}
                alt={selectedTrack.title}
                className="w-20 h-20 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <h5 className="text-white font-semibold">{selectedTrack.title}</h5>
              <p className="text-slate-300 text-sm">{selectedTrack.artist}</p>
              {selectedTrack.isrc && (
                <p className="text-slate-400 text-sm">ISRC: {selectedTrack.isrc}</p>
              )}
              <p className="text-slate-400 text-xs mt-1">
                {selectedTrack.album} • {new Date(selectedTrack.releaseDate).getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};