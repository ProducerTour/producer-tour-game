import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { feedApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { ActivityFeedItem } from '../components/feed/ActivityFeedItem';
import SocialSidebar from '../components/SocialSidebar';

export default function SinglePostPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  // If not logged in, redirect to login with return URL
  if (!token || !user) {
    const returnUrl = encodeURIComponent(`/post/${id}`);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  // Fetch the post
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['single-post', id],
    queryFn: async () => {
      const response = await feedApi.getSinglePost(id!);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-background">
        <SocialSidebar />
        <div className="pl-20">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-theme-background">
        <SocialSidebar />
        <div className="pl-20">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-theme-card rounded-2xl shadow-sm p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-theme-foreground mb-2">Post Not Found</h2>
              <p className="text-theme-foreground-muted mb-6">
                This post may have been deleted or is no longer available.
              </p>
              <button
                onClick={() => navigate('/my-profile')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-theme-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Activity Feed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <SocialSidebar />
      <div className="pl-20">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-theme-foreground-muted hover:text-theme-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Post */}
          <ActivityFeedItem item={post} />

          {/* View Profile Link */}
          {post.user.profileSlug && (
            <div className="mt-6 text-center">
              <Link
                to={`/user/${post.user.profileSlug}`}
                className="text-theme-primary hover:underline"
              >
                View {post.user.firstName}'s profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
