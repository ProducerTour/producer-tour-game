import { Link } from 'react-router-dom';
import { Music, Trophy, ShoppingBag, Plane, TrendingUp, UserPlus, Heart, MessageCircle, Share2, MoreHorizontal, Send, Loader2, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '../../lib/api';
import toast from 'react-hot-toast';

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
    likeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
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
    case 'POST':
      return <Edit3 className="w-5 h-5 text-blue-600" />;
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


export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (liked) {
        return feedApi.unlike(item.id);
      } else {
        return feedApi.like(item.id);
      }
    },
    onMutate: async () => {
      // Save current state for rollback
      const previousLiked = liked;
      const previousLikeCount = likeCount;

      // Optimistic update
      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

      // Return context with previous values
      return { previousLiked, previousLikeCount };
    },
    onError: (_error, _variables, context) => {
      // Revert to saved state from context
      if (context) {
        setLiked(context.previousLiked);
        setLikeCount(context.previousLikeCount);
      }
      toast.error('Failed to update like');
    },
  });

  // Fetch comments when showing
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['feed-comments', item.id],
    queryFn: async () => {
      const response = await feedApi.getComments(item.id);
      return response.data;
    },
    enabled: showComments,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await feedApi.addComment(item.id, content);
      return response.data;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['feed-comments', item.id] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      toast.success('Comment added!');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const handleLike = () => {
    if (!item.id.startsWith('mock-')) {
      likeMutation.mutate();
    } else {
      // For mock items, just toggle locally
      setLiked(!liked);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    if (!item.id.startsWith('mock-')) {
      addCommentMutation.mutate(commentText.trim());
    } else {
      toast.success('Comment added! (mock)');
      setCommentText('');
    }
  };

  const userDisplayName =
    item.user.firstName && item.user.lastName
      ? `${item.user.firstName} ${item.user.lastName}`
      : 'Producer';

  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
  });

  const comments = commentsData?.comments || [];

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
        <Link
          to={`/marketplace/${item.listing.slug}`}
          className="block mx-6 mb-4 border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
        >
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
        </Link>
      )}

      {/* Engagement Stats */}
      {(likeCount > 0 || (item.commentCount ?? 0) > 0) && (
        <div className="px-6 py-2 flex items-center justify-between text-sm text-gray-500">
          {likeCount > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </span>
          )}
          {(item.commentCount ?? 0) > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {item.commentCount} {item.commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-around">
          <button
            onClick={handleLike}
            disabled={likeMutation.isPending}
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-4">
          {/* Existing Comments */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Link
                    to={comment.user.profileSlug ? `/user/${comment.user.profileSlug}` : `/user/id/${comment.user.id}`}
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                  >
                    {comment.user.profilePhotoUrl ? (
                      <img
                        src={comment.user.profilePhotoUrl}
                        alt={comment.user.firstName || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                        {comment.user.firstName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 bg-white rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={comment.user.profileSlug ? `/user/${comment.user.profileSlug}` : `/user/id/${comment.user.id}`}
                        className="font-medium text-sm text-gray-900 hover:underline"
                      >
                        {comment.user.firstName} {comment.user.lastName}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">No comments yet. Be the first to comment!</p>
          )}

          {/* Add Comment Input */}
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
