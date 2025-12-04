import { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { FindCollaboratorsPane } from '../components/profile/FindCollaboratorsPane';
import { TourMilesWidget } from '../components/profile/TourMilesWidget';
import { AdminPostsWidget } from '../components/profile/AdminPostsWidget';
import SocialSidebar from '../components/SocialSidebar';
import {
  MessageCircle,
  MapPin,
  Music,
  Users,
  ExternalLink,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  PackageIcon,
  Headphones,
  Loader2,
  Calendar,
  Edit2,
  Camera,
  ImageIcon,
  Store,
  Settings,
  BadgeCheck,
} from 'lucide-react';
import { FaSpotify, FaSoundcloud, FaTiktok, FaApple } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { ActivityFeed } from '../components/feed/ActivityFeed';
import { api } from '../lib/api';

type FeedView = 'my-posts' | 'network';
type ContentType = 'beat' | 'kit' | 'sample' | 'collab' | 'placement' | 'status';

export default function ActivityFeedPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [feedView, setFeedView] = useState<FeedView>('my-posts');
  const [postContent, setPostContent] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Refs for file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's full profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const response = await api.get('/profile/hub/me');
      return response.data.writer;
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      return api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Profile photo updated!');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile photo');
    },
  });

  // Upload banner mutation
  const uploadBannerMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('banner', file);
      return api.post('/profile/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Cover banner updated!');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cover banner');
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBannerMutation.mutate(file);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Please log in to view your profile</div>
      </div>
    );
  }

  const fullName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.firstName || profile?.lastName || 'User';

  const handlePost = () => {
    console.log('Creating post:', { content: postContent, type: selectedContentType });
    setPostContent('');
    setSelectedContentType(null);
  };

  const contentTypes: { type: ContentType; label: string; icon: any }[] = [
    { type: 'beat', label: 'Beat', icon: Music },
    { type: 'kit', label: 'Kit', icon: PackageIcon },
    { type: 'sample', label: 'Sample', icon: Headphones },
    { type: 'collab', label: 'Collab', icon: Users },
    { type: 'placement', label: 'Placement', icon: ExternalLink },
    { type: 'status', label: 'Status', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Collapsed Social Sidebar */}
      <SocialSidebar activePage="profile" />

      {/* Main Content - offset for sidebar */}
      <div className="ml-20 max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Main Feed Column - 2/3 */}
          <div className="flex-1 min-w-0">
            {/* Profile Banner Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
              {/* Hidden file inputs */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleBannerChange}
                className="hidden"
              />

              {/* Cover Image */}
              <div
                className="h-56 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative group cursor-pointer"
                onClick={() => bannerInputRef.current?.click()}
              >
                {profile?.coverBannerUrl ? (
                  <img
                    src={profile.coverBannerUrl}
                    alt="Cover banner"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500"></div>
                )}
                {/* Hover overlay for banner */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2 text-white">
                    {uploadBannerMutation.isPending ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm font-medium">Change Cover</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-6">
                <div className="flex items-end justify-between -mt-20 mb-6">
                  {/* Avatar */}
                  <div
                    className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden relative z-10 group cursor-pointer"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {profile?.profilePhotoUrl ? (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-5xl font-semibold">
                        {profile?.firstName?.charAt(0) || 'U'}
                      </div>
                    )}
                    {/* Hover overlay for avatar */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-1 text-white">
                        {uploadAvatarMutation.isPending ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-6 h-6" />
                            <span className="text-xs font-medium">Edit</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Link
                      to="/my-store"
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Store className="w-4 h-4" />
                      My Store
                    </Link>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 shadow-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                    <Link
                      to="/settings?section=tourhub"
                      className="p-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all hover:scale-105 shadow-sm"
                      title="Profile Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </Link>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
                          {user?.role === 'ADMIN' && (
                            <span title="Verified Admin">
                              <BadgeCheck className="w-7 h-7 text-amber-500 fill-amber-100" />
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500">@{profile?.email?.split('@')[0] || 'user'}</p>
                      </div>

                      {profile?.bio && (
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed max-w-2xl">
                          {profile.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-6 text-gray-600 text-sm">
                        {profile?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                        {profile?.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {profile.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                        {profile?.createdAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Social Media Links - Modern Gradient Style */}
                      {(profile?.spotifyArtistUrl ||
                        profile?.instagramHandle ||
                        profile?.twitterHandle ||
                        profile?.linkedinUrl ||
                        profile?.tiktokHandle ||
                        profile?.soundcloudUrl ||
                        profile?.youtubeChannelUrl ||
                        profile?.appleMusicUrl) && (
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

                      {/* Stats */}
                      <div className="flex gap-8 pt-6 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 mb-1">{profile?.stats?.placementCount || 0}</div>
                          <div className="text-gray-500 text-sm">Placements</div>
                        </div>
                        <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="text-3xl font-bold text-gray-900 mb-1">{profile?.stats?.followers?.toLocaleString() || 0}</div>
                          <div className="text-gray-500 text-sm">Followers</div>
                        </div>
                        <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="text-3xl font-bold text-gray-900 mb-1">{profile?.stats?.following?.toLocaleString() || 0}</div>
                          <div className="text-gray-500 text-sm">Following</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">${profile?.stats?.totalSales?.toFixed(0) || '0'}</div>
                          <div className="text-gray-500 text-sm">Total Sales</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Create Post Section */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  {profile?.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                      {profile?.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all"
                    rows={3}
                  />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      {contentTypes.map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() =>
                            setSelectedContentType(selectedContentType === type ? null : type)
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            selectedContentType === type
                              ? 'bg-purple-100 text-purple-600'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                          title={label}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handlePost}
                      disabled={!postContent.trim()}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all ${
                        postContent.trim()
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed View Toggle */}
            <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setFeedView('my-posts')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  feedView === 'my-posts'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                My Posts
              </button>
              <button
                onClick={() => setFeedView('network')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  feedView === 'network'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Network Feed
              </button>
            </div>

            {/* Activity Feed */}
            <ActivityFeed userId={feedView === 'my-posts' ? user.id : undefined} />
          </div>

          {/* Sidebar Widgets - 1/3 - Sticky position */}
          <div className="w-[400px] flex-shrink-0 hidden lg:block">
            <div className="sticky top-6 space-y-6 max-h-[calc(100vh-48px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <TourMilesWidget />
              <FindCollaboratorsPane />
              <AdminPostsWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['my-profile'] });
        }}
      />
    </div>
  );
}
