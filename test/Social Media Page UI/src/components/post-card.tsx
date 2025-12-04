import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Post } from './activity-feed';
import { Heart, MessageCircle, Share2, MoreHorizontal, ExternalLink } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <ImageWithFallback
                src={post.author.avatar}
                alt={post.author.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="hover:underline cursor-pointer">{post.author.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{post.author.username}</span>
                <span>•</span>
                <span>{post.timestamp}</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Post Content */}
        <div className="mt-4">
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      </div>

      {/* Post Image */}
      {post.type === 'photo' && post.image && (
        <div className="w-full">
          <ImageWithFallback
            src={post.image}
            alt="Post image"
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Link Preview */}
      {post.type === 'link' && post.link && (
        <div className="mx-6 mb-4 border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors cursor-pointer">
          <div className="aspect-video w-full bg-gray-100">
            <ImageWithFallback
              src={post.link.thumbnail}
              alt={post.link.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm mb-1">{post.link.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{post.link.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <ExternalLink className="w-3 h-3" />
                  <span>{new URL(post.link.url).hostname}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 ${
              post.liked ? 'text-red-500' : 'text-gray-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
            <span className="text-sm">{post.likes.toLocaleString()}</span>
          </button>
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 text-gray-600"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments}</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-gray-50 text-gray-600">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">{post.shares}</span>
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
