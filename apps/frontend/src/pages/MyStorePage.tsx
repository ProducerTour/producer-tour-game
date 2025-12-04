import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SocialSidebar from '../components/SocialSidebar';
import {
  Store,
  Plus,
  CreditCard,
  ExternalLink,
  DollarSign,
  ShoppingBag,
  Eye,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Music,
  FileAudio,
  Layers,
  Mic2,
  Wrench,
  BookOpen,
  X,
} from 'lucide-react';
import { marketplaceApi, paymentApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  coverImageUrl?: string;
  slug: string;
  status: string;
  viewCount: number;
  purchaseCount: number;
  createdAt: string;
}

interface SalesData {
  sales: Array<{
    id: string;
    grossAmount: number;
    netAmount: number;
    createdAt: string;
    listing: {
      title: string;
      coverImageUrl?: string;
    };
    buyer: {
      firstName: string;
      lastName: string;
    };
  }>;
  totalEarnings: number;
  pagination: {
    total: number;
  };
}

const CATEGORY_OPTIONS = [
  { value: 'BEATS', label: 'Beats', icon: Music },
  { value: 'SAMPLES', label: 'Samples', icon: FileAudio },
  { value: 'PRESETS', label: 'Presets', icon: Layers },
  { value: 'STEMS', label: 'Stems', icon: Mic2 },
  { value: 'SERVICES', label: 'Services', icon: Wrench },
  { value: 'TEMPLATES', label: 'Templates', icon: Package },
  { value: 'COURSES', label: 'Courses', icon: BookOpen },
  { value: 'OTHER', label: 'Other', icon: Package },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).substring(2, 8);
}

export default function MyStorePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'BEATS',
    price: '',
    coverImageUrl: '',
    audioPreviewUrl: '',
    fileUrl: '',
    tags: '',
  });

  // Fetch Stripe status
  const { data: stripeStatus, isLoading: stripeLoading } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: async () => {
      const response = await paymentApi.getStatus();
      return response.data;
    },
  });

  // Fetch user's listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await marketplaceApi.getListings({ userId: user?.id });
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Fetch sales data
  const { data: salesData } = useQuery<SalesData>({
    queryKey: ['my-sales'],
    queryFn: async () => {
      const response = await marketplaceApi.getSales();
      return response.data;
    },
  });

  // Create onboarding link mutation
  const createOnboardingMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = `${window.location.origin}/my-store?stripe=success`;
      const refreshUrl = `${window.location.origin}/my-store?stripe=refresh`;
      const response = await paymentApi.createOnboardingLink(returnUrl, refreshUrl);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast.error('Failed to create onboarding link');
    },
  });

  // Dashboard link mutation
  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await paymentApi.getDashboardLink();
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: () => {
      toast.error('Failed to open Stripe dashboard');
    },
  });

  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await marketplaceApi.createListing({
        title: data.title,
        description: data.description,
        category: data.category,
        price: parseFloat(data.price),
        coverImageUrl: data.coverImageUrl || undefined,
        audioPreviewUrl: data.audioPreviewUrl || undefined,
        fileUrl: data.fileUrl || undefined,
        slug: generateSlug(data.title),
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Listing created successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create listing');
    },
  });

  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await marketplaceApi.updateListing(id, {
        title: data.title,
        description: data.description,
        category: data.category,
        price: parseFloat(data.price),
        coverImageUrl: data.coverImageUrl || undefined,
        audioPreviewUrl: data.audioPreviewUrl || undefined,
        fileUrl: data.fileUrl || undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Listing updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      setEditingListing(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update listing');
    },
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      await marketplaceApi.deleteListing(id);
    },
    onSuccess: () => {
      toast.success('Listing deleted');
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
    onError: () => {
      toast.error('Failed to delete listing');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'BEATS',
      price: '',
      coverImageUrl: '',
      audioPreviewUrl: '',
      fileUrl: '',
      tags: '',
    });
  };

  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price.toString(),
      coverImageUrl: listing.coverImageUrl || '',
      audioPreviewUrl: '',
      fileUrl: '',
      tags: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (editingListing) {
      updateListingMutation.mutate({ id: editingListing.id, data: formData });
    } else {
      createListingMutation.mutate(formData);
    }
  };

  const listings = listingsData?.listings || [];
  const isStripeConnected = stripeStatus?.stripeOnboardingComplete;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Collapsed Social Sidebar */}
      <SocialSidebar activePage="store" />

      {/* Main Content - offset for sidebar */}
      <div className="ml-20 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Store</h1>
              <p className="text-gray-500">Manage your products and Stripe payouts</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                <p className="text-sm text-gray-500">Products</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${salesData?.totalEarnings?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-500">Total Earnings</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{salesData?.pagination?.total || 0}</p>
                <p className="text-sm text-gray-500">Total Sales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 rounded-xl">
                <Eye className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.reduce((sum: number, l: Listing) => sum + (l.viewCount || 0), 0)}
                </p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect Section */}
        <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Payment Setup</h2>
            </div>
          </div>
          <div className="p-6">
            {stripeLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            ) : isStripeConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Stripe Connected</p>
                    <p className="text-sm text-gray-500">Your account is ready to receive payments</p>
                  </div>
                </div>
                <button
                  onClick={() => dashboardMutation.mutate()}
                  disabled={dashboardMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {dashboardMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Open Stripe Dashboard
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Connect Stripe to Receive Payments</p>
                    <p className="text-sm text-gray-500">
                      Set up your Stripe account to start selling products and receiving payouts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => createOnboardingMutation.mutate()}
                  disabled={createOnboardingMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  {createOnboardingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Connect Stripe
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Listings Grid */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Your Products</h2>
          </div>
          {listingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
              <p className="text-gray-500 mb-4">Start selling by adding your first product</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {listings.map((listing: Listing) => {
                const CategoryIcon = CATEGORY_OPTIONS.find(c => c.value === listing.category)?.icon || Package;
                return (
                  <div key={listing.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    {listing.coverImageUrl ? (
                      <img
                        src={listing.coverImageUrl}
                        alt={listing.title}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <CategoryIcon className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
                        <span className="text-lg font-bold text-green-600">${listing.price}</span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{listing.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {listing.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {listing.purchaseCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(listing)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this listing?')) {
                                deleteListingMutation.mutate(listing.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Browse Marketplace Link */}
        <div className="mt-6 text-center">
          <Link
            to="/marketplace"
            className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-2"
          >
            Browse Marketplace
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingListing) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingListing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingListing(null);
                  resetForm();
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Title */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Dark Trap Beat Pack"
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        formData.category === value
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Price (USD) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29.99"
                    className="w-full pl-8 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-gray-400"
                  required
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="trap, dark, 808"
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={createListingMutation.isPending || updateListingMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {(createListingMutation.isPending || updateListingMutation.isPending) ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {editingListing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
