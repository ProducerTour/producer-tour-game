import React from 'react';

interface PlacementCardProps {
  placement: {
    id: string;
    title: string;
    artist: string;
    platform: string;
    releaseDate: string;
    streams: number;
    status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
    albumName?: string;
    genre?: string;
    releaseYear?: string;
    label?: string;
    albumArtUrl?: string;
    albumArtHQUrl?: string;
    artistThumbUrl?: string;
  };
  onUpdateStreams?: (placement: any) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (placement: any) => void;
  viewMode?: 'list' | 'grid';
}

export const EnhancedPlacementCard: React.FC<PlacementCardProps> = ({
  placement,
  onUpdateStreams,
  onUpdateStatus,
  onDelete,
  onEdit,
  viewMode = 'list',
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatStreams = (streams: number) => {
    if (streams >= 1000000) {
      return (streams / 1000000).toFixed(1) + 'M';
    } else if (streams >= 1000) {
      return (streams / 1000).toFixed(0) + 'K';
    }
    return streams.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      SPOTIFY: '🎧',
      APPLE_MUSIC: '🍎',
      AMAZON_MUSIC: '📦',
      YOUTUBE_MUSIC: '▶️',
      TIDAL: '🌊',
      DEEZER: '🎵',
      SOUNDCLOUD: '☁️',
      OTHER: '🎶',
    };
    return icons[platform] || '🎶';
  };

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 transition-all duration-300 overflow-hidden group hover:shadow-xl hover:shadow-blue-500/20">
        {/* Album Art Header */}
        <div className="relative aspect-square bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden">
          {placement.albumArtUrl || placement.artistThumbUrl ? (
            <img
              src={placement.albumArtHQUrl || placement.albumArtUrl || placement.artistThumbUrl}
              alt={placement.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23334155" width="200" height="200"/%3E%3Ctext fill="%2394a3b8" font-size="48" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🎵%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {getPlatformIcon(placement.platform)}
            </div>
          )}

          {/* Overlay with Platform Badge */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium border border-white/20">
              {placement.platform.replace('_', ' ')}
            </span>
          </div>

          {/* Stream Count Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-green-400 text-sm font-semibold border border-green-500/30">
              {placement.streams > 0 ? `${formatStreams(placement.streams)} streams` : 'No streams'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(placement.status)}`}>
              {placement.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-1 truncate">{placement.title}</h3>
          <p className="text-slate-400 text-sm mb-3 truncate">{placement.artist}</p>

          {/* Metadata Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {placement.genre && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                {placement.genre}
              </span>
            )}
            {placement.releaseYear && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                {placement.releaseYear}
              </span>
            )}
            {placement.label && (
              <span className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded text-xs truncate max-w-full">
                {placement.label}
              </span>
            )}
          </div>

          {/* Album Name */}
          {placement.albumName && (
            <div className="text-xs text-slate-500 mb-3 truncate">
              Album: {placement.albumName}
            </div>
          )}

          <div className="text-xs text-slate-500 mb-4">{formatDate(placement.releaseDate)}</div>

          {/* Actions */}
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(placement)}
                className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(placement.id)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 transition-all duration-200 overflow-hidden group hover:shadow-lg">
      <div className="flex items-start gap-4 p-4">
        {/* Album Art Thumbnail */}
        <div className="flex-shrink-0">
          {placement.albumArtUrl || placement.artistThumbUrl ? (
            <img
              src={placement.albumArtUrl || placement.artistThumbUrl}
              alt={placement.title}
              className="w-20 h-20 rounded-lg object-cover shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23334155" width="80" height="80"/%3E%3Ctext fill="%2394a3b8" font-size="32" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E🎵%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-3xl shadow-lg">
              {getPlatformIcon(placement.platform)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg truncate">{placement.title}</h3>
              <p className="text-slate-400 text-sm truncate">{placement.artist}</p>
              {placement.albumName && (
                <p className="text-slate-500 text-xs mt-1 truncate">
                  Album: {placement.albumName}
                </p>
              )}
            </div>

            {/* Streams & Platform */}
            <div className="text-right flex-shrink-0">
              <div className="text-green-400 font-semibold text-lg">
                {placement.streams > 0 ? formatStreams(placement.streams) : '0'}
              </div>
              <div className="text-slate-500 text-xs">streams</div>
            </div>
          </div>

          {/* Metadata Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-slate-700 rounded-full text-slate-300 text-xs">
              {getPlatformIcon(placement.platform)} {placement.platform.replace('_', ' ')}
            </span>
            {placement.genre && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
                {placement.genre}
              </span>
            )}
            {placement.releaseYear && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs border border-purple-500/30">
                {placement.releaseYear}
              </span>
            )}
            {placement.label && (
              <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs border border-pink-500/30 truncate max-w-xs">
                {placement.label}
              </span>
            )}
            <span className="text-slate-500 text-xs">{formatDate(placement.releaseDate)}</span>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {onUpdateStatus && (
                <select
                  value={placement.status}
                  onChange={(e) => onUpdateStatus(placement.id, e.target.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(placement.status)}`}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              )}
            </div>

            <div className="flex gap-2">
              {onUpdateStreams && (
                <button
                  onClick={() => onUpdateStreams(placement)}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors"
                >
                  Update Streams
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(placement)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(placement.id)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
