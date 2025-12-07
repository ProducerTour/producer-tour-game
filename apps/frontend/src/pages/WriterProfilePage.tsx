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
  Lock,
  ShieldOff,
} from 'lucide-react';
import { FaSpotify, FaSoundcloud, FaTiktok, FaApple } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';
import { ActivityFeed } from '../components/feed/ActivityFeed';
import { FindCollaboratorsPane } from '../components/profile/FindCollaboratorsPane';
import { FollowersModal } from '../components/feed/FollowersModal';
import { UserAvatarWithBorder } from '../components/UserAvatarWithBorder';
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
      // API returns { following: [...], pagination: {...} }
      return response.data?.following || [];
    },
    enabled: !!user?.id && !isOwnProfile,
  });

  const isFollowing = Array.isArray(followingList) && followingList.some((f: any) => f.id === profile?.id);

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

  // Check if this is a private profile (403 error)
  const isPrivateProfile = (error as any)?.response?.status === 403;

  if (error || !profile) {
    // Private profile view
    if (isPrivateProfile) {
      return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
          <div className="max-w-lg mx-auto px-4 py-20">
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Private Profile</h1>
              <p className="text-gray-500 mb-6">
                This user has set their profile to private. Only they can view their profile information.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/my-profile"
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to your profile
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Profile not found view
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
        <div className="max-w-lg mx-auto px-4 py-20">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <ShieldOff className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
            <p className="text-gray-500 mb-6">
              This profile doesn't exist or may have been removed.
            </p>
            <Link
              to="/my-profile"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to your profile
            </Link>
          </div>
        </div>
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

  // Check if current user is a customer (can't use chat)
  const canUseChat = user && user.role !== 'CUSTOMER';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <Link
          to="/my-profile"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Main Profile Column */}
          <div className="flex-1 min-w-0">
            {/* Profile Banner Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden mb-4 sm:mb-6">
              {/* Cover Image - smaller on mobile */}
              <div className="h-32 sm:h-56 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
                {profile.profilePhotoUrl && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 opacity-90"></div>
                )}
              </div>

              {/* Profile Info */}
              <div className="px-4 sm:px-8 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-20 mb-4 sm:mb-6">
                  {/* Avatar with animated border */}
                  <div className="relative z-10 mb-3 sm:mb-0">
                    <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-visible">
                      <UserAvatarWithBorder
                        userId={profile.id}
                        firstName={profile.firstName}
                        lastName={profile.lastName}
                        profilePhotoUrl={profile.profilePhotoUrl}
                        size="2xl"
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Action Buttons - stacked on mobile */}
                  {!isOwnProfile && user && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all text-sm sm:text-base shadow-lg flex-1 sm:flex-none ${
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
                        <span className="hidden xs:inline">{isFollowing ? 'Following' : 'Follow'}</span>
                      </button>
                      {canUseChat && (
                        <button
                          onClick={() => setOpenChatWithUser(profile.id)}
                          className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all text-sm sm:text-base shadow-lg flex-1 sm:flex-none"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="hidden xs:inline">Message</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isOwnProfile && (
                    <Link
                      to="/my-profile"
                      className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all text-sm sm:text-base shadow-lg"
                    >
                      Go to your profile
                    </Link>
                  )}
                </div>

                {/* User Details */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <h2 className="text-xl sm:text-3xl font-bold text-gray-900">{fullName}</h2>
                      {profile.role === 'ADMIN' && (
                        <span title="Verified Admin">
                          <BadgeCheck className="w-5 h-5 sm:w-7 sm:h-7 text-amber-500 fill-amber-100" />
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm sm:text-base mb-2">@{profile.profileSlug || 'user'}</p>
                    {/* Followers/Following - separate row on mobile */}
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
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

                  {profile.bio && (
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed max-w-2xl text-sm sm:text-base">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 sm:gap-6 text-gray-600 text-xs sm:text-sm">
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
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Activity</h3>
              <ActivityFeed userId={profile.id} />
            </div>
          </div>

          {/* Collaborators Sidebar - hidden on mobile */}
          <div className="w-full lg:w-[400px] flex-shrink-0 hidden lg:block">
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
