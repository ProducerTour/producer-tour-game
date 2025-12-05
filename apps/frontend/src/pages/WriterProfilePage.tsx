import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Loader2,
  Calendar,
  UserPlus,
  UserCheck,
  ArrowLeft,
  MessageCircle,
  BadgeCheck,
} from 'lucide-react';
import { FaSpotify, FaSoundcloud, FaTiktok, FaApple } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';
import { ActivityFeed } from '../components/feed/ActivityFeed';
import { FindCollaboratorsPane } from '../components/profile/FindCollaboratorsPane';
import { FollowersModal } from '../components/feed/FollowersModal';
import { api, feedApi } from '../lib/api';
import toast from 'react-hot-toast';

export default function WriterProfilePage() {
  const { slug, userId } = useParams<{ slug?: string; userId?: string }>();
  const { user } = useAuthStore();
  const { setOpenChatWithUser } = useChatStore();
  const queryClient = useQueryClient();
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

  // Determine if we're fetching by slug or userId
  const identifier = slug || userId;
  const isIdLookup = !!userId && !slug;

  // Fetch writer profile by slug or userId
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['writer-profile', identifier, isIdLookup ? 'id' : 'slug'],
    queryFn: async () => {
      const endpoint = isIdLookup
        ? `/profile/hub/id/${userId}`
        : `/profile/hub/${slug}`;
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!identifier,
  });

  const isOwnProfile = user?.id === profile?.id;

  // Check if current user is following this profile
  const { data: followingList } = useQuery({
    queryKey: ['my-following'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await feedApi.getFollowing(user.id);
      return response.data || [];
    },
    enabled: !!user?.id && !isOwnProfile,
  });

  const isFollowing = followingList?.some((f: any) => f.id === profile?.id);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => feedApi.follow(profile?.id),
    onMutate: () => setIsFollowLoading(true),
    onSuccess: () => {
      toast.success(`You are now following ${fullName}!`);
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      queryClient.invalidateQueries({ queryKey: ['writer-profile', identifier] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to follow user');
    },
    onSettled: () => setIsFollowLoading(false),
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: () => feedApi.unfollow(profile?.id),
    onMutate: () => setIsFollowLoading(true),
    onSuccess: () => {
      toast.success(`Unfollowed ${fullName}`);
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      queryClient.invalidateQueries({ queryKey: ['writer-profile', identifier] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unfollow user');
    },
    onSettled: () => setIsFollowLoading(false),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="text-gray-600 text-lg">Profile not found</div>
        <Link
          to="/my-profile"
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to your profile
        </Link>
      </div>
    );
  }

  const fullName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.lastName || 'User';

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Back Button */}
        <Link
          to="/my-profile"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex gap-6">
          {/* Main Profile Column - 2/3 */}
          <div className="flex-1 min-w-0">
            {/* Profile Banner Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
              {/* Cover Image */}
              <div className="h-56 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
                {profile.profilePhotoUrl && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 opacity-90"></div>
                )}
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-6">
                <div className="flex items-end justify-between -mt-20 mb-6">
                  {/* Avatar */}
                  <div className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden relative z-10">
                    {profile.profilePhotoUrl ? (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-5xl font-semibold">
                        {profile.firstName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && user && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all hover:scale-105 shadow-lg ${
                          isFollowing
                            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl'
                        }`}
                      >
                        {isFollowLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isFollowing ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button
                        onClick={() => setOpenChatWithUser(profile.id)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 shadow-lg"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  )}

                  {isOwnProfile && (
                    <Link
                      to="/my-profile"
                      className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 shadow-lg"
                    >
                      Go to your profile
                    </Link>
                  )}
                </div>

                {/* User Details */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
                      {profile.role === 'ADMIN' && (
                        <span title="Verified Admin">
                          <BadgeCheck className="w-7 h-7 text-amber-500 fill-amber-100" />
                        </span>
                      )}
                      <span className="text-gray-400">·</span>
                      <div className="flex items-center gap-3 text-sm">
                        <button
                          onClick={() => {
                            setFollowersModalTab('followers');
                            setIsFollowersModalOpen(true);
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          <span className="font-semibold text-gray-900">{profile.stats?.followers?.toLocaleString() || 0}</span>
                          <span className="text-gray-500 ml-1">Followers</span>
                        </button>
                        <button
                          onClick={() => {
                            setFollowersModalTab('following');
                            setIsFollowersModalOpen(true);
                          }}
                          className="hover:underline cursor-pointer"
                        >
                          <span className="font-semibold text-gray-900">{profile.stats?.following?.toLocaleString() || 0}</span>
                          <span className="text-gray-500 ml-1">Following</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-500">@{profile.profileSlug || 'user'}</p>
                  </div>

                  {profile.bio && (
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed max-w-2xl">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-6 text-gray-600 text-sm">
                    {profile.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {profile.createdAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Joined{' '}
                          {new Date(profile.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Social Media Links - Modern Gradient Style */}
                  {(profile.spotifyArtistUrl ||
                    profile.instagramHandle ||
                    profile.twitterHandle ||
                    profile.linkedinUrl ||
                    profile.tiktokHandle ||
                    profile.soundcloudUrl ||
                    profile.youtubeChannelUrl ||
                    profile.appleMusicUrl) && (
                    <div className="flex flex-wrap gap-3">
                      {profile.spotifyArtistUrl && (
                        <a
                          href={profile.spotifyArtistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="Spotify"
                        >
                          <FaSpotify className="w-5 h-5" />
                        </a>
                      )}
                      {profile.instagramHandle && (
                        <a
                          href={`https://instagram.com/${profile.instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="Instagram"
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {profile.twitterHandle && (
                        <a
                          href={`https://twitter.com/${profile.twitterHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="X (Twitter)"
                        >
                          <Twitter className="w-5 h-5" />
                        </a>
                      )}
                      {profile.linkedinUrl && (
                        <a
                          href={profile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-5 h-5" />
                        </a>
                      )}
                      {profile.tiktokHandle && (
                        <a
                          href={`https://tiktok.com/@${profile.tiktokHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-gray-900 via-pink-600 to-cyan-400 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="TikTok"
                        >
                          <FaTiktok className="w-5 h-5" />
                        </a>
                      )}
                      {profile.soundcloudUrl && (
                        <a
                          href={profile.soundcloudUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="SoundCloud"
                        >
                          <FaSoundcloud className="w-5 h-5" />
                        </a>
                      )}
                      {profile.youtubeChannelUrl && (
                        <a
                          href={profile.youtubeChannelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="YouTube"
                        >
                          <Youtube className="w-5 h-5" />
                        </a>
                      )}
                      {profile.appleMusicUrl && (
                        <a
                          href={profile.appleMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-gradient-to-br from-gray-700 to-gray-900 text-white rounded-xl shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                          title="Apple Music"
                        >
                          <FaApple className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* User's Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <ActivityFeed userId={profile.id} />
            </div>
          </div>

          {/* Collaborators Sidebar - 1/3 */}
          <div className="w-[400px] flex-shrink-0 hidden lg:block">
            <FindCollaboratorsPane />
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={profile.id}
        initialTab={followersModalTab}
        userName={fullName}
      />
    </div>
  );
}
