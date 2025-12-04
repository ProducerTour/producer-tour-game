import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Loader2, ShoppingBag, Plus } from 'lucide-react';
import { marketplaceApi } from '../../lib/api';
import { Link } from 'react-router-dom';
import { CreateListingModal } from '../marketplace/CreateListingModal';

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

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'BEATS', label: 'Beats' },
  { value: 'SAMPLES', label: 'Sample Packs' },
  { value: 'PRESETS', label: 'Presets' },
  { value: 'STEMS', label: 'Stems' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'TEMPLATES', label: 'Templates' },
  { value: 'COURSES', label: 'Courses' },
  { value: 'OTHER', label: 'Other' },
];

export function MarketplaceFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['marketplace-listings', searchQuery, selectedCategory],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      const response = await marketplaceApi.getListings(params);
      return response.data;
    },
  });

  const listings = data?.listings || [];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Marketplace</h2>
            <p className="text-sm text-gray-600">
              Discover beats, samples, and services from producers
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white rounded-lg transition-all hover:scale-105 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create Listing</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-red-600 mb-2 font-semibold">Failed to load marketplace</div>
          <div className="text-sm text-gray-600">
            {(error as any)?.message || 'Please try again later'}
          </div>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Listings Found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {searchQuery || selectedCategory
              ? 'Try adjusting your search or filters'
              : 'Be the first to add a listing to the marketplace!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing: MarketplaceListing) => {
            const sellerName =
              listing.seller.firstName && listing.seller.lastName
                ? `${listing.seller.firstName} ${listing.seller.lastName}`
                : 'Producer';

            return (
              <Link
                key={listing.id}
                to={`/marketplace/${listing.slug}`}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
              >
                {/* Cover Image */}
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
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-purple-600 transition-colors">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {listing.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
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
                      <span className="text-xs text-gray-600">{sellerName}</span>
                    </div>

                    {/* Price */}
                    <div className="text-lg font-bold text-purple-600">
                      ${listing.price}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{listing.viewCount} views</span>
                    <span>{listing.purchaseCount} sold</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
