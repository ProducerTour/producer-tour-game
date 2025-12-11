import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Reply, MoreHorizontal, Pencil, Trash2, Flag, ChevronDown, Loader2, Send } from 'lucide-react';
import { feedApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  userId: string;
  content: string;
  parentId?: string | null;
  likeCount: number;
  isLiked: boolean;
  replyCount?: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    profileSlug: string | null;
  };
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  feedItemId: string;
  feedItemUserId: string; // Post author ID for permissions
  isReply?: boolean;
  onOpenReport: (entityType: 'comment', entityId: string) => void;
}

export function CommentItem({
  comment,
  feedItemId,
  feedItemUserId,
  isReply = false,
  onOpenReport,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);

  // Permission checks
  const isCommentOwner = user?.id === comment.userId;
  const isPostOwner = user?.id === feedItemUserId;
  const isAdmin = user?.role === 'ADMIN';
  const canDelete = isCommentOwner || isPostOwner || isAdmin;
  const canEdit = isCommentOwner;

  const displayName = comment.user.firstName && comment.user.lastName
    ? `${comment.user.firstName} ${comment.user.lastName}`
    : 'User';

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (liked) {
        return feedApi.unlikeComment(comment.id);
      } else {
        return feedApi.likeComment(comment.id);
      }
    },
    onMutate: () => {
      const prevLiked = liked;
      const prevCount = likeCount;
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
      return { prevLiked, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        setLiked(context.prevLiked);
        setLikeCount(context.prevCount);
      }
      toast.error('Failed to update like');
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      return feedApi.editComment(comment.id, editContent.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-comments', feedItemId] });
      setIsEditing(false);
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return feedApi.deleteComment(comment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-comments', feedItemId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      return feedApi.addComment(feedItemId, replyContent.trim(), comment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-comments', feedItemId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      setReplyContent('');
      setIsReplying(false);
      toast.success('Reply added');
    },
    onError: () => {
      toast.error('Failed to add reply');
    },
  });

  // Fetch more replies
  const { data: moreRepliesData, isLoading: loadingMoreReplies, refetch: fetchMoreReplies } = useQuery({
    queryKey: ['comment-replies', comment.id],
    queryFn: async () => {
      const response = await feedApi.getCommentReplies(comment.id, { offset: 2 }); // Skip first 2 already shown
      return response.data;
    },
    enabled: showAllReplies && (comment.replyCount || 0) > 2,
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate();
    }
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    editMutation.mutate();
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    replyMutation.mutate();
  };

  const handleViewMoreReplies = () => {
    setShowAllReplies(true);
    fetchMoreReplies();
  };

  // Initial replies from the comment data (first 2)
  const initialReplies = comment.replies || [];
  // Additional replies fetched via "view more"
  const additionalReplies = moreRepliesData?.replies || [];
  // Total reply count
  const totalReplies = comment.replyCount || initialReplies.length;
  const hiddenRepliesCount = totalReplies - initialReplies.length;

  return (
    <div className={`${isReply ? 'ml-10' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Link
          to={comment.user.profileSlug ? `/user/${comment.user.profileSlug}` : `/user/id/${comment.user.id}`}
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
        >
          {comment.user.profilePhotoUrl ? (
            <img
              src={comment.user.profilePhotoUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
              {comment.user.firstName?.charAt(0) || 'U'}
            </div>
          )}
        </Link>

        {/* Comment Content */}
        <div className="flex-1">
          <div className="relative bg-white rounded-lg px-3 py-2 group">
            <div className="flex items-center gap-2">
              <Link
                to={comment.user.profileSlug ? `/user/${comment.user.profileSlug}` : `/user/id/${comment.user.id}`}
                className="font-medium text-sm text-gray-900 hover:underline"
              >
                {displayName}
              </Link>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editMutation.isPending}
                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {editMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
            )}

            {/* Menu Button */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onOpenReport('comment', comment.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Flag className="w-3 h-3" />
                    Report
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-1 ml-2">
            <button
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
          </div>

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                placeholder={`Reply to ${comment.user.firstName || 'user'}...`}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                autoFocus
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Replies */}
          {!isReply && initialReplies.length > 0 && (
            <div className="mt-2 space-y-2">
              {initialReplies.map((reply: Comment) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  feedItemId={feedItemId}
                  feedItemUserId={feedItemUserId}
                  isReply
                  onOpenReport={onOpenReport}
                />
              ))}

              {/* Additional replies from "View more" */}
              {showAllReplies && additionalReplies.map((reply: Comment) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  feedItemId={feedItemId}
                  feedItemUserId={feedItemUserId}
                  isReply
                  onOpenReport={onOpenReport}
                />
              ))}

              {/* View more replies button */}
              {hiddenRepliesCount > 0 && !showAllReplies && (
                <button
                  onClick={handleViewMoreReplies}
                  disabled={loadingMoreReplies}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 ml-10"
                >
                  {loadingMoreReplies ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  View {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
