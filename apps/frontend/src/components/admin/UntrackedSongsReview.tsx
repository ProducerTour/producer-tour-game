/**
 * UntrackedSongsReview Component
 *
 * Displays songs from statements that couldn't be matched to Manage Placements.
 * Allows admins to:
 * - Search for and link to existing placements
 * - Mark songs for writer follow-up (onboarding prompt)
 * - Skip songs (leave unassigned)
 */

import { useState, useEffect } from 'react';
import { Search, Link2, AlertCircle, CheckCircle, XCircle, Music, Users, DollarSign } from 'lucide-react';
import { placementApi } from '@/lib/api';

export interface UntrackedSong {
  workTitle: string;
  revenue: number;
  metadata: any;
  reason: string;
  statementItemId?: string;
}

interface PlacementSearchResult {
  id: string;
  title: string;
  artist: string;
  credits: Array<{
    firstName: string;
    lastName: string;
    splitPercentage: number;
  }>;
  status: string;
  caseNumber?: string;
}

interface UntrackedSongsReviewProps {
  songs: UntrackedSong[];
  onLinkToPlacement: (song: UntrackedSong, placementId: string) => void;
  onMarkForFollowUp: (song: UntrackedSong) => void;
  onSkip: (song: UntrackedSong) => void;
  onClose?: () => void;
}

export function UntrackedSongsReview({
  songs,
  onLinkToPlacement,
  onMarkForFollowUp,
  onSkip,
  onClose,
}: UntrackedSongsReviewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlacementSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSongIndex, setActiveSongIndex] = useState<number | null>(null);
  const [processedSongs, setProcessedSongs] = useState<Set<string>>(new Set());

  // Search for placements
  const searchPlacements = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await placementApi.list({ search: query, limit: 10 });
      setSearchResults(response.data.placements || []);
    } catch (error) {
      console.error('Placement search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchPlacements(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const openSearchForSong = (index: number) => {
    const song = songs[index];
    setActiveSongIndex(index);
    setSearchQuery(song.workTitle);
    setSearchResults([]);
  };

  const handleLinkToPlacement = (song: UntrackedSong, placementId: string) => {
    onLinkToPlacement(song, placementId);
    setProcessedSongs(prev => new Set(prev).add(song.workTitle));
    setActiveSongIndex(null);
  };

  const handleMarkForFollowUp = (song: UntrackedSong) => {
    onMarkForFollowUp(song);
    setProcessedSongs(prev => new Set(prev).add(song.workTitle));
    setActiveSongIndex(null);
  };

  const handleSkip = (song: UntrackedSong) => {
    onSkip(song);
    setProcessedSongs(prev => new Set(prev).add(song.workTitle));
    setActiveSongIndex(null);
  };

  const remainingSongs = songs.filter(s => !processedSongs.has(s.workTitle));
  const totalRevenue = remainingSongs.reduce((sum, s) => sum + s.revenue, 0);

  if (remainingSongs.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-2xl border border-white/[0.08] p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">All Songs Reviewed</h3>
        <p className="text-gray-400 mb-6">
          All untracked songs have been processed. You can now continue with statement processing.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-surface rounded-xl font-medium hover:bg-white/90 transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Untracked Songs</h2>
              <p className="text-gray-400 text-sm">
                {remainingSongs.length} songs couldn't be matched to Manage Placements
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400">Total unassigned revenue</div>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="divide-y divide-white/[0.08]">
        {remainingSongs.map((song, index) => (
          <div key={song.workTitle + index} className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    <Music className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{song.workTitle}</h4>
                    <p className="text-gray-500 text-sm">{song.reason}</p>
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-white font-medium">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {song.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openSearchForSong(index)}
                  className="px-3 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Link
                </button>
                <button
                  onClick={() => handleMarkForFollowUp(song)}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  title="Mark for writer follow-up"
                >
                  <Users className="w-4 h-4" />
                  Follow Up
                </button>
                <button
                  onClick={() => handleSkip(song)}
                  className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
                  title="Skip this song"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Search Panel */}
            {activeSongIndex === index && (
              <div className="mt-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.08]">
                {/* Search Input */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                      placeholder="Search placements by title..."
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setActiveSongIndex(null)}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Search Results */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="text-center py-4 text-gray-400">
                      Searching placements...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((placement) => (
                      <button
                        key={placement.id}
                        onClick={() => handleLinkToPlacement(song, placement.id)}
                        className="w-full p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{placement.title}</div>
                            <div className="text-gray-400 text-sm">{placement.artist}</div>
                          </div>
                          <div className="text-right">
                            {placement.caseNumber && (
                              <span className="px-2 py-0.5 bg-white/[0.08] rounded text-xs text-gray-300 font-mono">
                                {placement.caseNumber}
                              </span>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {placement.credits.length} collaborator{placement.credits.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        {placement.credits.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {placement.credits.slice(0, 3).map((credit, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/[0.04] rounded text-xs text-gray-400">
                                {credit.firstName} {credit.lastName} ({credit.splitPercentage}%)
                              </span>
                            ))}
                            {placement.credits.length > 3 && (
                              <span className="px-2 py-0.5 bg-white/[0.04] rounded text-xs text-gray-500">
                                +{placement.credits.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-4 text-gray-400">
                      <p>No placements found for "{searchQuery}"</p>
                      <p className="text-sm mt-1">
                        This song may need to be registered in Manage Placements first.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">Enter at least 2 characters to search</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{processedSongs.size}</span> of{' '}
            <span className="text-white font-medium">{songs.length}</span> songs reviewed
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => remainingSongs.forEach(handleSkip)}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 rounded-lg text-sm transition-colors"
            >
              Skip All Remaining
            </button>
            <button
              onClick={() => remainingSongs.forEach(handleMarkForFollowUp)}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
            >
              Follow Up on All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UntrackedSongsReview;
