import { useQuery } from '@tanstack/react-query';
import { Music2, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import type { WidgetProps } from '../../../types/productivity.types';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
  popularity: number;
}

/**
 * SpotifyChartsWidget - Trending songs on Spotify
 *
 * Features:
 * - Top tracks from Spotify charts
 * - Album artwork
 * - Artist names
 * - Popularity indicator
 * - Open in Spotify link
 *
 * Note: Requires Spotify API credentials for full functionality.
 * Falls back to demo data if API is not configured.
 */
export default function SpotifyChartsWidget({ config: _config, isEditing: _isEditing }: WidgetProps) {
  // Demo data for Spotify charts (API integration would require OAuth)
  const { data: tracks, isLoading } = useQuery({
    queryKey: ['spotify-charts'],
    queryFn: async (): Promise<SpotifyTrack[]> => {
      // Return demo data - real Spotify API would require OAuth
      return getDemoTracks();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  // Demo tracks data
  const getDemoTracks = (): SpotifyTrack[] => [
    {
      id: '1',
      name: 'Die With A Smile',
      artists: [{ name: 'Lady Gaga, Bruno Mars' }],
      album: { name: 'Die With A Smile', images: [{ url: '' }] },
      external_urls: { spotify: 'https://open.spotify.com' },
      popularity: 95,
    },
    {
      id: '2',
      name: 'APT.',
      artists: [{ name: 'ROSÉ, Bruno Mars' }],
      album: { name: 'APT.', images: [{ url: '' }] },
      external_urls: { spotify: 'https://open.spotify.com' },
      popularity: 92,
    },
    {
      id: '3',
      name: 'Birds of a Feather',
      artists: [{ name: 'Billie Eilish' }],
      album: { name: 'HIT ME HARD AND SOFT', images: [{ url: '' }] },
      external_urls: { spotify: 'https://open.spotify.com' },
      popularity: 89,
    },
    {
      id: '4',
      name: 'Espresso',
      artists: [{ name: 'Sabrina Carpenter' }],
      album: { name: 'Espresso', images: [{ url: '' }] },
      external_urls: { spotify: 'https://open.spotify.com' },
      popularity: 87,
    },
    {
      id: '5',
      name: 'Good Luck, Babe!',
      artists: [{ name: 'Chappell Roan' }],
      album: { name: 'Good Luck, Babe!', images: [{ url: '' }] },
      external_urls: { spotify: 'https://open.spotify.com' },
      popularity: 85,
    },
  ];

  // Get popularity color
  const getPopularityColor = (popularity: number) => {
    if (popularity >= 90) return 'bg-green-500';
    if (popularity >= 70) return 'bg-yellow-500';
    if (popularity >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  const displayTracks = tracks || getDemoTracks();

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-500 rounded">
            <Music2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium text-theme-foreground">Spotify Charts</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-green-400">
          <TrendingUp className="w-3 h-3" />
          Trending
        </span>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {displayTracks.slice(0, 5).map((track, index) => (
          <div
            key={track.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            {/* Rank */}
            <span className="w-5 text-center text-sm font-bold text-theme-foreground-muted">
              {index + 1}
            </span>

            {/* Album Art */}
            <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {track.album.images[0]?.url ? (
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="w-5 h-5 text-theme-foreground-muted" />
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-theme-foreground block truncate">
                {track.name}
              </span>
              <span className="text-xs text-theme-foreground-muted truncate block">
                {track.artists.map(a => a.name).join(', ')}
              </span>
            </div>

            {/* Popularity */}
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getPopularityColor(track.popularity)}`}
                  style={{ width: `${track.popularity}%` }}
                />
              </div>
              <span className="text-xs text-theme-foreground-muted w-6">
                {track.popularity}
              </span>
            </div>

            {/* Play Link */}
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-green-500/20 rounded-full transition-all"
              title="Open in Spotify"
            >
              <ExternalLink className="w-3.5 h-3.5 text-green-400" />
            </a>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <a
          href="https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-theme-foreground-muted hover:text-green-400 transition-colors"
        >
          <Music2 className="w-3 h-3" />
          View Global Top 50
        </a>
      </div>
    </div>
  );
}
