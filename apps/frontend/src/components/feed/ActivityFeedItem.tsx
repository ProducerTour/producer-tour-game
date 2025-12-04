import { Link } from 'react-router-dom';
import { Music, Trophy, ShoppingBag, Plane, TrendingUp, UserPlus, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ActivityFeedItemProps {
  item: {
    id: string;
    userId: string;
    activityType: string;
    title: string;
    description?: string;
    placementId?: string;
    achievementId?: string;
    listingId?: string;
    metadata?: any;
    imageUrl?: string;
    isPublic: boolean;
    createdAt: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      profilePhotoUrl: string | null;
      profileSlug: string | null;
      gamificationPoints?: {
        tier: string;
      } | null;
    };
    listing?: {
      id: string;
      title: string;
      coverImageUrl: string | null;
      price: number;
      slug: string;
    } | null;
  };
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'PLACEMENT':
      return <Music className="w-5 h-5 text-green-600" />;
    case 'ACHIEVEMENT':
      return <Trophy className="w-5 h-5 text-yellow-600" />;
    case 'MARKETPLACE_LISTING':
      return <ShoppingBag className="w-5 h-5 text-purple-600" />;
    case 'TOUR_MILES_EARNED':
      return <Plane className="w-5 h-5 text-blue-600" />;
    case 'TIER_UP':
      return <TrendingUp className="w-5 h-5 text-orange-600" />;
    case 'REFERRAL_JOINED':
      return <UserPlus className="w-5 h-5 text-pink-600" />;
    default:
      return <Music className="w-5 h-5 text-gray-600" />;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'PLACEMENT':
      return 'border-green-500/20 bg-green-500/5';
    case 'ACHIEVEMENT':
      return 'border-yellow-500/20 bg-yellow-500/5';
    case 'MARKETPLACE_LISTING':
      return 'border-purple-500/20 bg-purple-500/5';
    case 'TOUR_MILES_EARNED':
      return 'border-blue-500/20 bg-blue-500/5';
    case 'TIER_UP':
      return 'border-orange-500/20 bg-orange-500/5';
    case 'REFERRAL_JOINED':
      return 'border-pink-500/20 bg-pink-500/5';
    default:
      return 'border-white/10 bg-slate-800/30';
  }
};

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const userDisplayName =
    item.user.firstName && item.user.lastName
      ? `${item.user.firstName} ${item.user.lastName}`
      : 'Producer';

  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Link
              to={item.user.profileSlug ? `/user/${item.user.profileSlug}` : `/user/id/${item.user.id}`}
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-purple-300 transition-all"
            >
              {item.user.profilePhotoUrl ? (
                <img
                  src={item.user.profilePhotoUrl}
                  alt={userDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                  {item.user.firstName?.charAt(0) || 'P'}
                </div>
              )}
            </Link>
            <div>
              <Link
                to={item.user.profileSlug ? `/user/${item.user.profileSlug}` : `/user/id/${item.user.id}`}
                className="font-semibold text-gray-900 hover:underline cursor-pointer"
              >
                {userDisplayName}
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {item.user.gamificationPoints?.tier && (
                  <>
                    <span className="text-purple-600">{item.user.gamificationPoints.tier}</span>
                    <span>•</span>
                  </>
                )}
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Post Content */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              {getActivityIcon(item.activityType)}
            </div>
            <span className="font-medium text-gray-900">{item.title}</span>
          </div>
          {item.description && (
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{item.description}</p>
          )}
        </div>
      </div>

      {/* Activity Image */}
      {item.imageUrl && !item.listing && (
        <div className="w-full">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Marketplace Listing Preview */}
      {item.listing && (
        <div className="mx-6 mb-4 border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors cursor-pointer">
          {item.listing.coverImageUrl && (
            <div className="aspect-video w-full bg-gray-100">
              <img
                src={item.listing.coverImageUrl}
                alt={item.listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <h4 className="font-semibold text-gray-900 mb-1">{item.listing.title}</h4>
            <p className="text-lg font-bold text-purple-600">${item.listing.price}</p>
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setLiked(!liked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 ${
              liked ? 'text-red-500' : 'text-gray-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm">Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 text-gray-600"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 text-gray-600">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
