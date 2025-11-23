import { Skeleton } from '../ui/Skeleton';

export function VideoCardSkeleton() {
  return (
    <div className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
      {/* Video Preview Skeleton */}
      <div className="relative w-full group">
        <div
          className="w-full relative flex items-center justify-center bg-zinc-900"
          style={{
            aspectRatio: '16/9',
          }}
        >
          <Skeleton className="w-full h-full" />
        </div>
      </div>

      {/* Video Info Skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Skeleton className="h-3 w-16" />
          <span>•</span>
          <Skeleton className="h-3 w-12" />
          <span>•</span>
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function FileCardSkeleton() {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="w-16 h-10 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="w-8 h-8 rounded" />
    </div>
  );
}

export function ProcessingJobSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="mt-2 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
