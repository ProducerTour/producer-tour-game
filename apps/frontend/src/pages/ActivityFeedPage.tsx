import { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { FindCollaboratorsPane } from '../components/profile/FindCollaboratorsPane';
import { TourMilesWidget } from '../components/profile/TourMilesWidget';
import { AdminPostsWidget } from '../components/profile/AdminPostsWidget';
import { FollowersModal } from '../components/feed/FollowersModal';
import { BannerCropperModal } from '../components/profile/BannerCropperModal';
import SocialSidebar from '../components/SocialSidebar';
import SocialHeader from '../components/SocialHeader';
import { AnimatedBorder, parseBorderConfig } from '../components/AnimatedBorder';
import {
  MapPin,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Loader2,
  Calendar,
  Edit2,
  Camera,
  ImageIcon,
  Store,
  Settings,
  BadgeCheck,
  X,
  Headphones,
  ExternalLink,
  Smile,
} from 'lucide-react';
import { FaSpotify, FaSoundcloud, FaTiktok, FaApple } from 'react-icons/fa';
import { useAuthStore } from '../store/auth.store';
import { ActivityFeed } from '../components/feed/ActivityFeed';
import { api, feedApi, gamificationApi } from '../lib/api';

type FeedView = 'my-posts' | 'network';

export default function ActivityFeedPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [feedView, setFeedView] = useState<FeedView>('my-posts');
  const [postContent, setPostContent] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postAudioFile, setPostAudioFile] = useState<File | null>(null);
  const [postAudioFileName, setPostAudioFileName] = useState<string | null>(null);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
  const [isBannerCropperOpen, setIsBannerCropperOpen] = useState(false);
  const [tempBannerUrl, setTempBannerUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Refs for file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const postAudioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user's full profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const response = await api.get('/profile/hub/me');
      return response.data.writer;
    },
  });

  // Fetch user's gamification customizations (border)
  const { data: customizations } = useQuery({
    queryKey: ['user-customizations', user?.id],
    queryFn: async () => {
      const response = await gamificationApi.getUserCustomizations(user!.id);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const equippedBorder = customizations?.border ? parseBorderConfig(customizations.border) : null;

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

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; imageUrl?: string | null; audioUrl?: string | null }) => {
      const response = await feedApi.createPost(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post created successfully!');
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setPostContent('');
      // Clear media state
      setPostImageFile(null);
      setPostImagePreview(null);
      setPostAudioFile(null);
      setPostAudioFileName(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create post');
    },
  });

  // Upload post image mutation
  const uploadPostImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await feedApi.uploadPostImage(file);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    },
  });

  // Upload post audio mutation
  const uploadPostAudioMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await feedApi.uploadPostAudio(file);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload audio');
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
      // Check file size (10MB max for banner)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Banner image must be less than 10MB');
        return;
      }
      // Create preview URL and open cropper
      const previewUrl = URL.createObjectURL(file);
      setTempBannerUrl(previewUrl);
      setIsBannerCropperOpen(true);
    }
    // Reset input so the same file can be selected again
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  const handleBannerCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' });
    uploadBannerMutation.mutate(croppedFile);

    // Clean up
    if (tempBannerUrl) {
      URL.revokeObjectURL(tempBannerUrl);
      setTempBannerUrl(null);
    }
  };

  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setPostImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPostImagePreview(previewUrl);
    }
  };

  const handlePostAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Audio must be less than 20MB');
        return;
      }
      // Check file type
      if (!['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'].includes(file.type)) {
        toast.error('Only MP3 and WAV files are supported');
        return;
      }
      setPostAudioFile(file);
      setPostAudioFileName(file.name);
    }
  };

  const clearPostImage = () => {
    setPostImageFile(null);
    if (postImagePreview) {
      URL.revokeObjectURL(postImagePreview);
    }
    setPostImagePreview(null);
    // Reset file input
    if (postImageInputRef.current) {
      postImageInputRef.current.value = '';
    }
  };

  const clearPostAudio = () => {
    setPostAudioFile(null);
    setPostAudioFileName(null);
    // Reset file input
    if (postAudioInputRef.current) {
      postAudioInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = postContent;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setPostContent(before + emojiData.emoji + after);

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emojiData.emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
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

  const handlePost = async () => {
    if (!postContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }

    // Create a title from first part of content
    const title = postContent.length > 50
      ? postContent.substring(0, 50) + '...'
      : postContent;

    let imageUrl: string | null = null;
    let audioUrl: string | null = null;

    // Upload image first if selected
    if (postImageFile) {
      try {
        const result = await uploadPostImageMutation.mutateAsync(postImageFile);
        imageUrl = result.imageUrl;
      } catch {
        // Error already handled by mutation
        return;
      }
    }

    // Upload audio if selected
    if (postAudioFile) {
      try {
        const result = await uploadPostAudioMutation.mutateAsync(postAudioFile);
        audioUrl = result.audioUrl;
      } catch {
        // Error already handled by mutation
        return;
      }
    }

    createPostMutation.mutate({
      title,
      description: postContent,
      imageUrl,
      audioUrl,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Collapsed Social Sidebar - hidden on mobile via usePlatform hook */}
      <SocialSidebar activePage="profile" />

      {/* Main Content - offset for sidebar on desktop, full width on mobile */}
      <div className="ml-0 md:ml-20">
        {/* Social Header with search, notifications, updates */}
        <SocialHeader title="My Profile" />

        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
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
                className="h-40 md:h-56 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative group cursor-pointer"
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
              <div className="px-4 md:px-8 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-6 gap-4">
                  {/* Avatar with Gamification Border */}
                  <div
                    className="relative z-10 group cursor-pointer"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <AnimatedBorder
                      border={equippedBorder}
                      size="2xl"
                      showBorder={!!equippedBorder}
                      className="shadow-xl"
                    >
                      {profile?.profilePhotoUrl ? (
                        <img
                          src={profile.profilePhotoUrl}
                          alt={fullName}
                          className="absolute inset-0 w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full rounded-full bg-purple-500 flex items-center justify-center text-white text-5xl font-semibold">
                          {profile?.firstName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </AnimatedBorder>
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
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Link
                      to="/my-store"
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all text-sm sm:text-base flex-1 sm:flex-none"
                    >
                      <Store className="w-4 h-4" />
                      <span className="hidden xs:inline">My </span>Store
                    </Link>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 shadow-lg text-sm sm:text-base flex-1 sm:flex-none"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden xs:inline">Edit </span>Profile
                    </button>
                    <Link
                      to="/settings?section=tourhub"
                      className="p-2 sm:p-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all hover:scale-105 shadow-sm"
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
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
                          {user?.role === 'ADMIN' && (
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
                              <span className="font-semibold text-gray-900">{profile?.stats?.followers?.toLocaleString() || 0}</span>
                              <span className="text-gray-500 ml-1">Followers</span>
                            </button>
                            <button
                              onClick={() => {
                                setFollowersModalTab('following');
                                setIsFollowersModalOpen(true);
                              }}
                              className="hover:underline cursor-pointer"
                            >
                              <span className="font-semibold text-gray-900">{profile?.stats?.following?.toLocaleString() || 0}</span>
                              <span className="text-gray-500 ml-1">Following</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-500">@{profile?.profileSlug || profile?.email?.split('@')[0] || 'user'}</p>
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

                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Create Post Section */}
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-4">
              {/* Hidden file inputs */}
              <input
                ref={postImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePostImageChange}
                className="hidden"
              />
              <input
                ref={postAudioInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp3"
                onChange={handlePostAudioChange}
                className="hidden"
              />

              <div className="flex gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0">
                  {profile?.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white text-lg sm:text-xl font-semibold">
                      {profile?.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all text-sm sm:text-base"
                    rows={2}
                  />

                  {/* Image Preview */}
                  {postImagePreview && (
                    <div className="relative mt-3 inline-block">
                      <img
                        src={postImagePreview}
                        alt="Post preview"
                        className="max-h-48 rounded-xl object-cover"
                      />
                      <button
                        onClick={clearPostImage}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Audio Preview */}
                  {postAudioFileName && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <Headphones className="w-5 h-5 text-purple-600" />
                      <span className="flex-1 text-sm text-gray-700 truncate">{postAudioFileName}</span>
                      <button
                        onClick={clearPostAudio}
                        className="p-1 hover:bg-purple-200 rounded-full transition-colors"
                        title="Remove audio"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <div className="flex gap-1 sm:gap-2 relative">
                      {/* Add Image Button */}
                      <button
                        onClick={() => postImageInputRef.current?.click()}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                          postImagePreview
                            ? 'bg-purple-100 text-purple-600'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Add Image"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Image</span>
                      </button>

                      {/* Add Audio Button */}
                      <button
                        onClick={() => postAudioInputRef.current?.click()}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                          postAudioFileName
                            ? 'bg-purple-100 text-purple-600'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Add Audio (MP3, WAV)"
                      >
                        <Headphones className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Audio</span>
                      </button>

                      {/* Emoji Button */}
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                          showEmojiPicker
                            ? 'bg-purple-100 text-purple-600'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Add Emoji"
                      >
                        <Smile className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Emoji</span>
                      </button>

                      {/* Emoji Picker Popup */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50 max-w-[calc(100vw-2rem)]">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            autoFocusSearch={false}
                            height={350}
                            width={300}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handlePost}
                      disabled={!postContent.trim() || createPostMutation.isPending || uploadPostImageMutation.isPending || uploadPostAudioMutation.isPending}
                      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all text-sm sm:text-base ${
                        postContent.trim() && !createPostMutation.isPending && !uploadPostImageMutation.isPending && !uploadPostAudioMutation.isPending
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(createPostMutation.isPending || uploadPostImageMutation.isPending || uploadPostAudioMutation.isPending) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {uploadPostImageMutation.isPending || uploadPostAudioMutation.isPending ? 'Uploading...' : createPostMutation.isPending ? 'Posting...' : 'Post'}
                      </span>
                      <span className="sm:hidden">
                        {(uploadPostImageMutation.isPending || uploadPostAudioMutation.isPending || createPostMutation.isPending) ? '' : 'Post'}
                      </span>
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
                Activity Feed
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
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['my-profile'] });
          queryClient.invalidateQueries({ queryKey: ['user-profile'] }); // Sync with Settings page
        }}
      />

      {/* Followers/Following Modal */}
      {user && (
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          userId={user.id}
          initialTab={followersModalTab}
          userName={fullName}
        />
      )}

      {/* Banner Cropper Modal */}
      {tempBannerUrl && (
        <BannerCropperModal
          isOpen={isBannerCropperOpen}
          onClose={() => {
            setIsBannerCropperOpen(false);
            if (tempBannerUrl) {
              URL.revokeObjectURL(tempBannerUrl);
              setTempBannerUrl(null);
            }
          }}
          imageUrl={tempBannerUrl}
          onCropComplete={handleBannerCropComplete}
        />
      )}
    </div>
  );
}
