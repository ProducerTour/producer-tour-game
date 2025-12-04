import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ShoppingCart, Loader2, Info, CreditCard } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { marketplaceApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  coverImageUrl: string | null;
  audioPreviewUrl: string | null;
  slug: string;
  seller: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    profileSlug: string | null;
  };
}

interface PurchaseModalProps {
  listing: MarketplaceListing | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseModal({ listing, isOpen, onClose }: PurchaseModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate commission based on user role
  const commissionRate = user?.role === 'WRITER' ? 0 : 5; // 0% for WRITER, 5% for CUSTOMER
  const listingPrice = listing?.price || 0;
  const commissionAmount = listingPrice * (commissionRate / 100);
  const totalPrice = listingPrice + commissionAmount;

  const sellerName =
    listing?.seller.firstName && listing?.seller.lastName
      ? `${listing.seller.firstName} ${listing.seller.lastName}`
      : 'Producer';

  // Purchase mutation (would integrate with Stripe in production)
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!listing) throw new Error('No listing selected');

      // In production, this would:
      // 1. Create Stripe Payment Intent
      // 2. Show Stripe checkout
      // 3. Confirm payment
      // 4. Process purchase on backend

      // For now, simulate purchase
      const response = await marketplaceApi.purchase({
        listingId: listing.id,
        stripePaymentIntentId: 'simulated_payment_' + Date.now(),
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Purchase successful! Check your email for download link.');
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-purchases'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete purchase');
    },
  });

  const handlePurchase = async () => {
    if (!listing) return;

    // Check if user is trying to buy their own listing
    if (listing.seller.id === user?.id) {
      toast.error("You can't purchase your own listing");
      return;
    }

    setIsProcessing(true);

    try {
      // In production, would integrate with Stripe Elements here
      // For now, directly call purchase mutation
      await purchaseMutation.mutateAsync();
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!listing) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-bold text-white">
              Complete Purchase
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </div>

          {/* Listing Preview */}
          <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden mb-6">
            {listing.coverImageUrl && (
              <img
                src={listing.coverImageUrl}
                alt={listing.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="font-semibold text-white mb-1">{listing.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                {listing.description}
              </p>
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
                <span className="text-sm text-slate-400">by {sellerName}</span>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4 mb-6">
            <h4 className="text-sm font-semibold text-white mb-3">Price Breakdown</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Listing Price</span>
                <span className="text-white">${listingPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Platform Fee ({commissionRate}%)</span>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-slate-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-950 border border-white/10 rounded text-xs text-slate-300 z-10">
                      {user?.role === 'WRITER'
                        ? 'Writers get 0% platform fee on all purchases!'
                        : 'Platform fee helps maintain and improve the marketplace.'}
                    </div>
                  </div>
                </div>
                <span className={commissionRate === 0 ? 'text-green-400' : 'text-white'}>
                  ${commissionAmount.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-xl font-bold text-purple-400">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Benefit Badge (for WRITER role) */}
          {user?.role === 'WRITER' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-green-400 mb-1">
                    Writer Benefit
                  </div>
                  <div className="text-xs text-green-400/80">
                    As a verified writer, you enjoy 0% platform fees on all marketplace purchases!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <CreditCard className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-400">
                <strong>Secure Payment:</strong> Your payment will be processed securely through Stripe.
                After purchase, you'll receive an email with download instructions.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={isProcessing || purchaseMutation.isPending}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || purchaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Purchase ${totalPrice.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
