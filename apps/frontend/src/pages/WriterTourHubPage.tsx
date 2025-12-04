import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  MapPin,
  Globe,
  Music,
  Instagram,
  Twitter,
  Linkedin,
  Trophy,
  Plane,
  Calendar,
  ArrowLeft,
  User,
  Disc3,
  ExternalLink,
  Lock,
  Youtube,
  CloudRain,
  Smartphone,
  Edit,
  X,
  Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, gamificationApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { EditableField } from '../components/profile/EditableField';
import { AnimatedBorder, parseBorderConfig } from '../components/AnimatedBorder';

interface Placement {
  id: string;
  songTitle: string;
  artistName: string;
  releaseDate: string | null;
  syncType: string | null;
}

interface GamificationPoints {
  totalPoints: number;
  currentTier: string;
  tourMiles: number;
}

interface WriterProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  spotifyArtistUrl: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  linkedinUrl: string | null;
  tiktokHandle: string | null;
  soundcloudUrl: string | null;
  youtubeChannelUrl: string | null;
  appleMusicUrl: string | null;
  isPublicProfile: boolean;
  profileSlug: string;
  createdAt: string;
  placements: Placement[];
  gamificationPoints: GamificationPoints | null;
}

const getTierColor = (tier: string) => {
  switch (tier?.toUpperCase()) {
    case 'BRONZE': return 'from-amber-600 to-amber-800';
    case 'SILVER': return 'from-gray-400 to-gray-600';
    case 'GOLD': return 'from-yellow-400 to-yellow-600';
    case 'PLATINUM': return 'from-cyan-300 to-cyan-500';
    case 'DIAMOND': return 'from-purple-400 to-blue-400';
    default: return 'from-slate-500 to-slate-700';
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'TBA';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function WriterTourHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: writer, isLoading, error } = useQuery<WriterProfile>({
    queryKey: ['writer-profile', slug],
    queryFn: async () => {
      const response = await api.get(`/profile/writer/${slug}`);
      return response.data;
    },
    enabled: !!slug,
    retry: false,
  });

  // Fetch the writer's equipped customizations (border)
  const { data: customizations } = useQuery({
    queryKey: ['user-customizations', writer?.id],
    queryFn: async () => {
      const response = await gamificationApi.getUserCustomizations(writer!.id);
      return response.data;
    },
    enabled: !!writer?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    bio: '',
    location: '',
    website: '',
    spotifyArtistUrl: '',
    instagramHandle: '',
    twitterHandle: '',
    linkedinUrl: '',
    tiktokHandle: '',
    soundcloudUrl: '',
    youtubeChannelUrl: '',
    appleMusicUrl: '',
  });

  // Detect if viewing own profile
  const isOwnProfile = user?.id === writer?.id;

  // Initialize edited data when writer loads
  useEffect(() => {
    if (writer && isOwnProfile) {
      setEditedData({
        bio: writer.bio || '',
        location: writer.location || '',
        website: writer.website || '',
        spotifyArtistUrl: writer.spotifyArtistUrl || '',
        instagramHandle: writer.instagramHandle || '',
        twitterHandle: writer.twitterHandle || '',
        linkedinUrl: writer.linkedinUrl || '',
        tiktokHandle: writer.tiktokHandle || '',
        soundcloudUrl: writer.soundcloudUrl || '',
        youtubeChannelUrl: writer.youtubeChannelUrl || '',
        appleMusicUrl: writer.appleMusicUrl || '',
      });
    }
  }, [writer, isOwnProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<typeof editedData>) =>
      api.put('/profile/hub', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['writer-profile', slug] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleFieldBlur = (field: keyof typeof editedData, value: string) => {
    // Only save if value changed
    if (writer && writer[field] !== value) {
      updateProfileMutation.mutate({ [field]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (error || !writer) {
    const is403 = (error as any)?.response?.status === 403;
    const is404 = (error as any)?.response?.status === 404;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
            {is403 ? (
              <Lock className="w-12 h-12 text-slate-500" />
            ) : (
              <User className="w-12 h-12 text-slate-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {is403 ? 'Private Profile' : is404 ? 'Writer Not Found' : 'Error Loading Profile'}
          </h1>
          <p className="text-slate-400 mb-6">
            {is403
              ? 'This writer has set their profile to private.'
              : is404
                ? 'The writer profile you are looking for does not exist.'
                : 'Something went wrong while loading this profile.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${writer.firstName} ${writer.lastName}`;
  const tierClass = getTierColor(writer.gamificationPoints?.currentTier || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">Writer Profile</span>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Edit Mode Toggle - Only for own profile */}
        {isOwnProfile && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel Editing
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </button>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden mb-8">
          {/* Cover gradient */}
          <div className={`h-32 bg-gradient-to-r ${tierClass}`}></div>

          <div className="px-6 pb-6">
            {/* Avatar and Name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 mb-6">
              <div className="relative">
                <AnimatedBorder
                  border={customizations?.border ? parseBorderConfig(customizations.border) : null}
                  size="xl"
                  showBorder={!!customizations?.border}
                  className="shadow-lg"
                >
                  {writer.profilePhotoUrl ? (
                    <img
                      src={writer.profilePhotoUrl}
                      alt={fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {writer.firstName[0]}{writer.lastName[0]}
                      </span>
                    </div>
                  )}
                </AnimatedBorder>
                {writer.gamificationPoints && (
                  <div className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-r ${tierClass} flex items-center justify-center border-2 border-slate-800`}>
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">{fullName}</h1>
                {isEditing ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 mt-1 justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <EditableField
                      value={editedData.location}
                      onChange={(value) => setEditedData({ ...editedData, location: value })}
                      onBlur={() => handleFieldBlur('location', editedData.location)}
                      placeholder="Add your location"
                      className="text-sm"
                    />
                  </div>
                ) : (
                  writer.location && (
                    <div className="flex items-center gap-1 text-slate-400 mt-1 justify-center sm:justify-start">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words">{writer.location}</span>
                    </div>
                  )
                )}
              </div>

              {/* Stats Badges */}
              {writer.gamificationPoints && (
                <div className="flex gap-3">
                  <div className="bg-slate-700/50 rounded-xl px-4 py-2 text-center border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Tier</div>
                    <div className={`font-bold bg-gradient-to-r ${tierClass} bg-clip-text text-transparent`}>
                      {writer.gamificationPoints.currentTier || 'Starter'}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl px-4 py-2 text-center border border-white/5">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Tour Miles</div>
                    <div className="font-bold text-white">
                      {writer.gamificationPoints.tourMiles?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {isEditing ? (
              <div className="mb-6 max-w-3xl">
                <EditableField
                  value={editedData.bio}
                  onChange={(value) => setEditedData({ ...editedData, bio: value })}
                  onBlur={() => handleFieldBlur('bio', editedData.bio)}
                  placeholder="Tell us about yourself..."
                  multiline={true}
                  className="text-sm text-slate-300"
                />
              </div>
            ) : (
              writer.bio && (
                <p className="text-slate-300 leading-relaxed mb-6 max-w-3xl break-words">
                  {writer.bio}
                </p>
              )
            )}

            {/* Social Links */}
            <div className="flex flex-wrap gap-3">
              {(isEditing || writer.website) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.website}
                      onChange={(value) => setEditedData({ ...editedData, website: value })}
                      onBlur={() => handleFieldBlur('website', editedData.website)}
                      placeholder="https://yourwebsite.com"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Globe className="w-4 h-4 text-slate-400" />}
                    />
                  ) : (
                    <a
                      href={writer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors border border-white/5"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.spotifyArtistUrl) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.spotifyArtistUrl}
                      onChange={(value) => setEditedData({ ...editedData, spotifyArtistUrl: value })}
                      onBlur={() => handleFieldBlur('spotifyArtistUrl', editedData.spotifyArtistUrl)}
                      placeholder="Spotify artist URL"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Music className="w-4 h-4 text-green-400" />}
                    />
                  ) : (
                    <a
                      href={writer.spotifyArtistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 rounded-lg text-green-400 hover:text-green-300 transition-colors border border-green-600/20"
                    >
                      <Music className="w-4 h-4" />
                      <span>Spotify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.instagramHandle) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.instagramHandle}
                      onChange={(value) => setEditedData({ ...editedData, instagramHandle: value })}
                      onBlur={() => handleFieldBlur('instagramHandle', editedData.instagramHandle)}
                      placeholder="Instagram handle (no @)"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Instagram className="w-4 h-4 text-pink-400" />}
                    />
                  ) : (
                    <a
                      href={`https://instagram.com/${writer.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 rounded-lg text-pink-400 hover:text-pink-300 transition-colors border border-pink-600/20 max-w-[200px] sm:max-w-none"
                    >
                      <Instagram className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">@{writer.instagramHandle}</span>
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.twitterHandle) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.twitterHandle}
                      onChange={(value) => setEditedData({ ...editedData, twitterHandle: value })}
                      onBlur={() => handleFieldBlur('twitterHandle', editedData.twitterHandle)}
                      placeholder="Twitter handle (no @)"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Twitter className="w-4 h-4 text-sky-400" />}
                    />
                  ) : (
                    <a
                      href={`https://twitter.com/${writer.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-sky-600/20 hover:bg-sky-600/30 rounded-lg text-sky-400 hover:text-sky-300 transition-colors border border-sky-600/20 max-w-[200px] sm:max-w-none"
                    >
                      <Twitter className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">@{writer.twitterHandle}</span>
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.linkedinUrl) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.linkedinUrl}
                      onChange={(value) => setEditedData({ ...editedData, linkedinUrl: value })}
                      onBlur={() => handleFieldBlur('linkedinUrl', editedData.linkedinUrl)}
                      placeholder="LinkedIn profile URL"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Linkedin className="w-4 h-4 text-blue-400" />}
                    />
                  ) : (
                    <a
                      href={writer.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 hover:text-blue-300 transition-colors border border-blue-600/20"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.tiktokHandle) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.tiktokHandle}
                      onChange={(value) => setEditedData({ ...editedData, tiktokHandle: value })}
                      onBlur={() => handleFieldBlur('tiktokHandle', editedData.tiktokHandle)}
                      placeholder="TikTok handle (no @)"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Smartphone className="w-4 h-4 text-slate-300" />}
                    />
                  ) : (
                    <a
                      href={`https://tiktok.com/@${writer.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600/20 hover:bg-slate-600/30 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-600/20 max-w-[200px] sm:max-w-none"
                    >
                      <Smartphone className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">@{writer.tiktokHandle}</span>
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.youtubeChannelUrl) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.youtubeChannelUrl}
                      onChange={(value) => setEditedData({ ...editedData, youtubeChannelUrl: value })}
                      onBlur={() => handleFieldBlur('youtubeChannelUrl', editedData.youtubeChannelUrl)}
                      placeholder="YouTube channel URL"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Youtube className="w-4 h-4 text-red-400" />}
                    />
                  ) : (
                    <a
                      href={writer.youtubeChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 hover:text-red-300 transition-colors border border-red-600/20"
                    >
                      <Youtube className="w-4 h-4" />
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.appleMusicUrl) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.appleMusicUrl}
                      onChange={(value) => setEditedData({ ...editedData, appleMusicUrl: value })}
                      onBlur={() => handleFieldBlur('appleMusicUrl', editedData.appleMusicUrl)}
                      placeholder="Apple Music artist URL"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<Music className="w-4 h-4 text-rose-400" />}
                    />
                  ) : (
                    <a
                      href={writer.appleMusicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 rounded-lg text-rose-400 hover:text-rose-300 transition-colors border border-rose-600/20"
                    >
                      <Music className="w-4 h-4" />
                      <span>Apple Music</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {(isEditing || writer.soundcloudUrl) && (
                <div className="inline-flex">
                  {isEditing ? (
                    <EditableField
                      value={editedData.soundcloudUrl}
                      onChange={(value) => setEditedData({ ...editedData, soundcloudUrl: value })}
                      onBlur={() => handleFieldBlur('soundcloudUrl', editedData.soundcloudUrl)}
                      placeholder="SoundCloud profile URL"
                      className="text-sm w-full min-w-[200px]"
                      prefix={<CloudRain className="w-4 h-4 text-orange-400" />}
                    />
                  ) : (
                    <a
                      href={writer.soundcloudUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 rounded-lg text-orange-400 hover:text-orange-300 transition-colors border border-orange-600/20"
                    >
                      <CloudRain className="w-4 h-4" />
                      <span>SoundCloud</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace Shop Link */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center">
                <Store className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {isOwnProfile ? 'Your Marketplace Shop' : `${fullName}'s Shop`}
                </h3>
                <p className="text-sm text-slate-300">
                  Browse beats, samples, and digital products
                </p>
              </div>
            </div>
            <Link
              to={`/user/${slug}/shop`}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium shadow-lg"
            >
              <Store className="w-4 h-4" />
              <span>View Shop</span>
            </Link>
          </div>
        </div>

        {/* Recent Placements */}
        {writer.placements && writer.placements.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-purple-400" />
                Recent Placements
              </h2>
            </div>

            <div className="divide-y divide-white/5">
              {writer.placements.map((placement) => (
                <div
                  key={placement.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                      <Music className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{placement.songTitle}</h3>
                      <p className="text-sm text-slate-400">{placement.artistName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {placement.syncType && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full mb-1">
                        {placement.syncType}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(placement.releaseDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Placements */}
        {(!writer.placements || writer.placements.length === 0) && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
            <Disc3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-400">No Placements Yet</h3>
            <p className="text-slate-500 text-sm">This writer's placements will appear here once published.</p>
          </div>
        )}

        {/* Member Since */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          Member since {formatDate(writer.createdAt)}
        </div>
      </main>
    </div>
  );
}
