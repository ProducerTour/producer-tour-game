import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserProfile } from '../App';
import { EditProfileModal } from './edit-profile-modal';
import { Edit2, MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import { ActivityFeed } from './activity-feed';

interface ProfileSectionProps {
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  isDemoMode: boolean;
}

export function ProfileSection({ profile, onProfileUpdate, isDemoMode }: ProfileSectionProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      {/* Full Width Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="h-56 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          {profile.coverImage && (
            <ImageWithFallback
              src={profile.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          {isDemoMode && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
              ✨ Demo: This is your cover photo
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-20 mb-6">
            <div className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden relative z-10">
              <ImageWithFallback
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div>
              <h2 className="text-3xl mb-1">{profile.name}</h2>
              <p className="text-gray-500">{profile.username}</p>
            </div>

            <p className="text-gray-700 whitespace-pre-line leading-relaxed max-w-2xl">{profile.bio}</p>

            <div className="flex flex-wrap gap-6 text-gray-600 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                <a href="#" className="text-blue-600 hover:underline">
                  alexmorgan.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Joined March 2023</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-3xl mb-1">{profile.posts}</div>
                <div className="text-gray-500 text-sm">Posts</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-3xl mb-1">{profile.followers.toLocaleString()}</div>
                <div className="text-gray-500 text-sm">Followers</div>
              </div>
              <div className="text-center cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-3xl mb-1">{profile.following.toLocaleString()}</div>
                <div className="text-gray-500 text-sm">Following</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed Below */}
      <ActivityFeed isDemoMode={isDemoMode} />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={onProfileUpdate}
      />
    </>
  );
}