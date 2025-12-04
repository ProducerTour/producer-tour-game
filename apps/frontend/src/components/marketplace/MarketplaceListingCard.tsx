import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Play, Pause, Eye, ShoppingCart } from 'lucide-react';
import ReactPlayer from 'react-player';

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  coverImageUrl: string | null;
  audioPreviewUrl: string | null;
  slug: string;
  viewCount: number;
  purchaseCount: number;
  seller: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    profileSlug: string | null;
    gamificationPoints?: {
      tier: string;
    } | null;
  };
}

interface MarketplaceListingCardProps {
  listing: MarketplaceListing;
  onPurchase?: (listing: MarketplaceListing) => void;
}

export function MarketplaceListingCard({ listing, onPurchase }: MarketplaceListingCardProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const sellerName =
    listing.seller.firstName && listing.seller.lastName
      ? `${listing.seller.firstName} ${listing.seller.lastName}`
      : 'Producer';

  const handlePurchaseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPurchase) {
      onPurchase(listing);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group">
      {/* Cover Image / Audio Preview */}
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {listing.coverImageUrl ? (
          <img
            src={listing.coverImageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 backdrop-blur-sm rounded text-xs text-white font-medium">
          {listing.category}
        </div>

        {/* Tier Badge (if seller has tier) */}
        {listing.seller.gamificationPoints?.tier && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 backdrop-blur-sm rounded text-xs text-white font-medium">
            {listing.seller.gamificationPoints.tier}
          </div>
        )}

        {/* Audio Preview Overlay */}
        {listing.audioPreviewUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPlayingPreview(!isPlayingPreview);
              }}
              className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors shadow-lg"
            >
              {isPlayingPreview ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Hidden Audio Player */}
        {listing.audioPreviewUrl && (
          <div className="hidden">
            <ReactPlayer
              url={listing.audioPreviewUrl}
              playing={isPlayingPreview}
              onEnded={() => setIsPlayingPreview(false)}
              width="0"
              height="0"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <Link to={`/marketplace/${listing.slug}`} className="block p-4 hover:bg-gray-50 transition-colors">
        <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-purple-600 transition-colors">
          {listing.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {listing.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mb-3">
          {/* Seller */}
          <div className="flex items-center gap-2">
            {listing.seller.profilePhotoUrl ? (
              <img
                src={listing.seller.profilePhotoUrl}
                alt={sellerName}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {listing.seller.firstName?.charAt(0) || 'P'}
              </div>
            )}
            {listing.seller.profileSlug ? (
              <Link
                to={`/user/${listing.seller.profileSlug}`}
                className="text-xs text-gray-600 hover:text-purple-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {sellerName}
              </Link>
            ) : (
              <span className="text-xs text-gray-600">{sellerName}</span>
            )}
          </div>

          {/* Price */}
          <div className="text-lg font-bold text-purple-600">
            ${listing.price.toFixed(2)}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {listing.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              {listing.purchaseCount} sold
            </span>
          </div>

          {/* Purchase Button */}
          {onPurchase && (
            <button
              onClick={handlePurchaseClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white text-xs font-medium rounded-lg transition-all hover:scale-105"
            >
              <ShoppingCart className="w-3 h-3" />
              Buy Now
            </button>
          )}
        </div>
      </Link>
    </div>
  );
}
