import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  UserCheck,
  MapPin,
  Loader2,
  Users,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { api, feedApi, userApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

interface Writer {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  profileSlug?: string;
  location?: string;
  bio?: string;
  role?: string;
  gamificationPoints?: {
    tier: string;
  };
}

interface WriterCardProps {
  writer: Writer;
  isFollowing?: boolean;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  isLoading?: boolean;
}

function WriterCard({ writer, isFollowing, onFollow, onUnfollow, isLoading }: WriterCardProps) {
  const fullName = `${writer.firstName || ''} ${writer.lastName || ''}`.trim() || 'Unknown';
  const tierColors: Record<string, string> = {
    BRONZE: 'bg-amber-600',
    SILVER: 'bg-gray-400',
    GOLD: 'bg-yellow-500',
    PLATINUM: 'bg-purple-500',
    DIAMOND: 'bg-cyan-400',
  };
  const tier = writer.gamificationPoints?.tier || 'BRONZE';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      {/* Avatar */}
      <Link
        to={writer.profileSlug ? `/user/${writer.profileSlug}` : `/user/id/${writer.id}`}
        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100 hover:ring-purple-300 transition-all"
      >
        {writer.profilePhotoUrl ? (
          <img
            src={writer.profilePhotoUrl}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
            {writer.firstName?.charAt(0) || 'U'}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Link
            to={writer.profileSlug ? `/user/${writer.profileSlug}` : `/user/id/${writer.id}`}
            className="font-medium text-gray-900 hover:text-purple-600 transition-colors truncate"
          >
            {fullName}
          </Link>
          {writer.role === 'ADMIN' && (
            <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-100 flex-shrink-0" title="Verified Admin" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${tierColors[tier]}`}>
            {tier}
          </span>
          {writer.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {writer.location}
            </span>
          )}
        </div>
      </div>

      {/* Follow Button */}
      <button
        onClick={() => isFollowing ? onUnfollow(writer.id) : onFollow(writer.id)}
        disabled={isLoading}
        className={`p-2 rounded-full transition-all ${
          isFollowing
            ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
        }`}
        title={isFollowing ? 'Unfollow' : 'Follow'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFollowing ? (
          <UserCheck className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export function FindCollaboratorsPane() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  // Suggested writers - empty for now until we have a dedicated endpoint
  const suggestedWriters: Writer[] = [];
  const loadingSuggested = false;

  // Search writers
  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ['search-writers', searchQuery],
    queryFn: async () => {
      try {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
        const response = await userApi.searchWriters(searchQuery);
        // API returns { success, results, count }
        const results = response.data?.results || [];
        // Map to Writer interface format
        return results.map((u: any) => ({
          id: u.id,
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          profilePhotoUrl: u.profilePhotoUrl,
          profileSlug: u.profileSlug,
          location: u.location,
          bio: u.bio,
          role: u.role,
          gamificationPoints: u.gamificationPoints,
        }));
      } catch {
        return [];
      }
    },
    enabled: searchQuery.trim().length >= 2,
  });

  // Get following list to check follow status
  const { data: followingList = [] } = useQuery({
    queryKey: ['my-following'],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        const response = await feedApi.getFollowing(user.id);
        // API returns { following: [...], pagination: {...} }
        return response.data?.following || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // followingList is array of user objects with id property
  const followingIds = new Set(followingList?.map((f: any) => f.id) || []);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: (userId: string) => feedApi.follow(userId),
    onMutate: (userId) => setLoadingUserId(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onSettled: () => setLoadingUserId(null),
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => feedApi.unfollow(userId),
    onMutate: (userId) => setLoadingUserId(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onSettled: () => setLoadingUserId(null),
  });

  const displayWriters = searchQuery.trim() ? searchResults : suggestedWriters;
  const isLoading = searchQuery.trim() ? loadingSearch : loadingSuggested;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4">
        <div className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold">Find Collaborators</h3>
        </div>
        <p className="text-white/80 text-sm mt-1">Connect with other writers</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search writers..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Writers List */}
      <div className="p-2 max-h-[500px] overflow-y-auto">
        {!searchQuery.trim() && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            Suggested for you
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : displayWriters && displayWriters.length > 0 ? (
          <div className="space-y-1">
            {displayWriters
              .filter((w: Writer) => w.id !== user?.id)
              .map((writer: Writer) => (
                <WriterCard
                  key={writer.id}
                  writer={writer}
                  isFollowing={followingIds.has(writer.id)}
                  onFollow={(id) => followMutation.mutate(id)}
                  onUnfollow={(id) => unfollowMutation.mutate(id)}
                  isLoading={loadingUserId === writer.id}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery.trim() ? 'No writers found' : 'No suggestions available'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <Link
          to="/marketplace"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1"
        >
          Browse Marketplace
          <span className="text-lg">→</span>
        </Link>
      </div>
    </div>
  );
}
