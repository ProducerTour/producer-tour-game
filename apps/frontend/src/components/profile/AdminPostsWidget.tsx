import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Loader2,
  MessageCircle,
  ExternalLink,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AdminPost {
  id: string;
  userId: string;
  activityType: string;
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    profileSlug?: string;
  };
}

export function AdminPostsWidget() {
  // Fetch admin activity/posts
  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const response = await api.get('/feed/admin-posts?limit=5');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const posts: AdminPost[] = data?.items || [];

  // Mock posts for testing when no data
  const mockPosts: AdminPost[] = [
    {
      id: 'admin-1',
      userId: 'admin',
      activityType: 'ANNOUNCEMENT',
      title: 'New Feature: Marketplace Launch!',
      description: 'We\'re excited to announce the launch of our social marketplace. Start selling your beats, samples, and more!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      user: {
        id: 'admin',
        firstName: 'Producer',
        lastName: 'Tour',
        profilePhotoUrl: undefined,
        profileSlug: 'producer-tour',
      },
    },
    {
      id: 'admin-2',
      userId: 'admin',
      activityType: 'UPDATE',
      title: 'Tour Miles Program Update',
      description: 'Earn more miles with our updated rewards program. Check out the new achievements!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      user: {
        id: 'admin',
        firstName: 'Producer',
        lastName: 'Tour',
        profilePhotoUrl: undefined,
        profileSlug: 'producer-tour',
      },
    },
    {
      id: 'admin-3',
      userId: 'admin',
      activityType: 'TIP',
      title: 'Pro Tip: Complete Your Profile',
      description: 'Profiles with photos and bio get 3x more engagement. Update yours today!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      user: {
        id: 'admin',
        firstName: 'Producer',
        lastName: 'Tour',
        profilePhotoUrl: undefined,
        profileSlug: 'producer-tour',
      },
    },
  ];

  const displayPosts = posts.length > 0 ? posts : mockPosts;

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative z-10">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">From Producer Tour</h3>
          </div>
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
            Official
          </span>
        </div>
      </div>

      {/* Posts */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No announcements yet</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                    PT
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {post.user.firstName} {post.user.lastName}
                    </span>
                    <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-100" />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>

                  <h4 className="font-medium text-gray-800 text-sm mb-1 line-clamp-1">
                    {post.title}
                  </h4>

                  {post.description && (
                    <p className="text-gray-500 text-xs line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  {/* Activity Type Badge */}
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      post.activityType === 'ANNOUNCEMENT'
                        ? 'bg-purple-50 text-purple-600'
                        : post.activityType === 'UPDATE'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {post.activityType === 'ANNOUNCEMENT' ? 'Announcement' :
                       post.activityType === 'UPDATE' ? 'Update' : 'Tip'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All Link */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <Link
          to="/announcements"
          className="flex items-center justify-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
        >
          View all announcements
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
