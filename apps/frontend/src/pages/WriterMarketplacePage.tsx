import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag, Search, Loader2, Store } from 'lucide-react';
import { api, marketplaceApi } from '../lib/api';
import { MarketplaceListingCard } from '../components/marketplace/MarketplaceListingCard';

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

export default function WriterMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch writer profile
  const { data: writer, isLoading: isLoadingWriter } = useQuery({
    queryKey: ['writer-profile', slug],
    queryFn: async () => {
      const response = await api.get(`/profile/hub/${slug}`);
      return response.data.writer;
    },
    enabled: !!slug,
  });

  // Fetch writer's marketplace listings
  const { data, isLoading: isLoadingListings } = useQuery({
    queryKey: ['writer-marketplace', slug, searchQuery],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (searchQuery) params.search = searchQuery;

      const response = await marketplaceApi.getUserListings(slug!, params);
      return response.data;
    },
    enabled: !!slug,
  });

  const listings = data?.listings || [];
  const stats = data?.stats || { totalListings: 0, totalSales: 0, totalRevenue: 0 };

  const writerName =
    writer?.firstName && writer?.lastName
      ? `${writer.firstName} ${writer.lastName}`
      : 'Producer';

  if (isLoadingWriter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!writer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Writer Not Found</h1>
          <Link to="/my-profile" className="text-purple-400 hover:text-purple-300">
            Return to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            to={`/user/${slug}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          <div className="flex items-center gap-4">
            {/* Writer Avatar */}
            {writer.profilePhotoUrl ? (
              <img
                src={writer.profilePhotoUrl}
                alt={writerName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
                {writer.firstName?.charAt(0) || 'P'}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {writerName}'s Shop
                <Store className="w-6 h-6 text-purple-400" />
              </h1>
              {writer.gamificationPoints?.tier && (
                <span className="inline-flex items-center px-2 py-1 mt-1 rounded text-xs bg-purple-500/20 text-purple-400">
                  {writer.gamificationPoints.tier}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="hidden md:flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalListings}</div>
                <div className="text-sm text-slate-400">Listings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.totalSales}</div>
                <div className="text-sm text-slate-400">Sales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  ${stats.totalRevenue.toFixed(2)}
                </div>
                <div className="text-sm text-slate-400">Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search this shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="md:hidden grid grid-cols-3 gap-4 mb-6 bg-slate-800/50 rounded-xl p-4 border border-white/10">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{stats.totalListings}</div>
            <div className="text-xs text-slate-400">Listings</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{stats.totalSales}</div>
            <div className="text-xs text-slate-400">Sales</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">
              ${stats.totalRevenue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-400">Revenue</div>
          </div>
        </div>

        {/* Listings Grid */}
        {isLoadingListings ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {searchQuery ? 'No Listings Found' : 'No Listings Yet'}
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query'
                : `${writerName} hasn't added any listings to their shop yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing: MarketplaceListing) => (
              <MarketplaceListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
