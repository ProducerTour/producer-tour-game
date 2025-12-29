import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  X,
  Save,
  Globe,
  MapPin,
  Music,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Smartphone,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FaSoundcloud } from 'react-icons/fa';
import { api } from '../../lib/api';

interface ProfileData {
  bio?: string;
  location?: string;
  website?: string;
  spotifyArtistUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  tiktokHandle?: string;
  soundcloudUrl?: string;
  youtubeChannelUrl?: string;
  appleMusicUrl?: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData | null | undefined;
  onSave: () => void;
}

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileData>({
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
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  useEffect(() => {
    // Re-initialize form data when modal opens or when profile data changes
    if (isOpen && profile) {
      setFormData({
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        spotifyArtistUrl: profile.spotifyArtistUrl || '',
        instagramHandle: profile.instagramHandle || '',
        twitterHandle: profile.twitterHandle || '',
        linkedinUrl: profile.linkedinUrl || '',
        tiktokHandle: profile.tiktokHandle || '',
        soundcloudUrl: profile.soundcloudUrl || '',
        youtubeChannelUrl: profile.youtubeChannelUrl || '',
        appleMusicUrl: profile.appleMusicUrl || '',
      });
      // Auto-expand social links section if any social link is populated
      const hasSocialLinks = !!(
        profile.spotifyArtistUrl ||
        profile.instagramHandle ||
        profile.twitterHandle ||
        profile.linkedinUrl ||
        profile.tiktokHandle ||
        profile.soundcloudUrl ||
        profile.youtubeChannelUrl ||
        profile.appleMusicUrl
      );
      if (hasSocialLinks) {
        setShowSocialLinks(true);
      }
    }
  }, [isOpen, profile]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileData) => api.put('/profile/hub', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Bio */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about yourself, your music journey, achievements..."
              rows={4}
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Los Angeles, CA"
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Website */}
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
              <Globe className="w-4 h-4" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Social Links Collapsible */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSocialLinks(!showSocialLinks)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700 font-medium">Social & Music Links</span>
              {showSocialLinks ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showSocialLinks && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
                {/* Spotify */}
                <div>
                  <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                    <Music className="w-4 h-4 text-green-600" />
                    Spotify Artist URL
                  </label>
                  <input
                    type="url"
                    value={formData.spotifyArtistUrl}
                    onChange={(e) => setFormData({ ...formData, spotifyArtistUrl: e.target.value })}
                    placeholder="https://open.spotify.com/artist/..."
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Instagram & Twitter */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      Instagram
                    </label>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-purple-500">
                      <span className="text-gray-400">@</span>
                      <input
                        type="text"
                        value={formData.instagramHandle}
                        onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value.replace('@', '') })}
                        placeholder="username"
                        className="flex-1 bg-transparent text-gray-900 outline-none text-sm placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <Twitter className="w-4 h-4 text-blue-500" />
                      Twitter / X
                    </label>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-purple-500">
                      <span className="text-gray-400">@</span>
                      <input
                        type="text"
                        value={formData.twitterHandle}
                        onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value.replace('@', '') })}
                        placeholder="username"
                        className="flex-1 bg-transparent text-gray-900 outline-none text-sm placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                    <Linkedin className="w-4 h-4 text-blue-700" />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* TikTok & YouTube */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <Smartphone className="w-4 h-4" />
                      TikTok
                    </label>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-purple-500">
                      <span className="text-gray-400">@</span>
                      <input
                        type="text"
                        value={formData.tiktokHandle}
                        onChange={(e) => setFormData({ ...formData, tiktokHandle: e.target.value.replace('@', '') })}
                        placeholder="username"
                        className="flex-1 bg-transparent text-gray-900 outline-none text-sm placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      YouTube
                    </label>
                    <input
                      type="url"
                      value={formData.youtubeChannelUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeChannelUrl: e.target.value })}
                      placeholder="https://youtube.com/@..."
                      className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Apple Music & SoundCloud */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <Music className="w-4 h-4 text-gray-700" />
                      Apple Music
                    </label>
                    <input
                      type="url"
                      value={formData.appleMusicUrl}
                      onChange={(e) => setFormData({ ...formData, appleMusicUrl: e.target.value })}
                      placeholder="https://music.apple.com/..."
                      className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
                      <FaSoundcloud className="w-4 h-4 text-orange-500" />
                      SoundCloud
                    </label>
                    <input
                      type="url"
                      value={formData.soundcloudUrl}
                      onChange={(e) => setFormData({ ...formData, soundcloudUrl: e.target.value })}
                      placeholder="https://soundcloud.com/..."
                      className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
