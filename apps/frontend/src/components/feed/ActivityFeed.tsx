import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Inbox } from 'lucide-react';
import { feedApi } from '../../lib/api';
import { ActivityFeedItem } from './ActivityFeedItem';

interface ActivityItem {
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
}

interface ActivityFeedResponse {
  items: ActivityItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

interface ActivityFeedProps {
  userId?: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const {
    data,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['activity-feed', userId],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await feedApi.getActivity({
        limit: 20,
        offset: pageParam,
        userId,
      });
      return response.data as ActivityFeedResponse;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.offset + lastPage.pagination.limit
        : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into single array
  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-sm">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-red-600 font-semibold mb-2">Failed to load activity feed</div>
        <div className="text-sm text-gray-600">
          {(error as any)?.message || 'Please try again later'}
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Activity Yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Your activity feed will show placements, achievements, and marketplace items from your network.
          Start by following other producers or adding your first placement!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allItems.map((item) => (
        <ActivityFeedItem key={item.id} item={item} />
      ))}

      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
      )}
    </div>
  );
}
