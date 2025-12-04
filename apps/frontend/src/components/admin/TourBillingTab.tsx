import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';

interface Transaction {
  id: string;
  listingId: string;
  listing: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    slug: string;
    category: string;
  };
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePhotoUrl: string | null;
    profileSlug: string | null;
  };
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  paidAt: string | null;
  createdAt: string;
}

interface SellerStatement {
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePhotoUrl: string | null;
    profileSlug: string | null;
  };
  totalSales: number;
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  transactions: Transaction[];
}

interface BillingData {
  overview: {
    totalGross: number;
    totalCommission: number;
    totalNet: number;
    totalTransactions: number;
    commissionRate: number;
  };
  sellerStatements: SellerStatement[];
  transactions: Transaction[];
}

export default function TourBillingTab() {
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());

  const { data: billingData, isLoading, error } = useQuery<BillingData>({
    queryKey: ['admin-tour-billing'],
    queryFn: async () => {
      const response = await api.get('/marketplace/admin/billing');
      return response.data;
    },
  });

  const toggleSellerExpanded = (sellerId: string) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerId)) {
        newSet.delete(sellerId);
      } else {
        newSet.add(sellerId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load billing data</p>
      </div>
    );
  }

  const overview = billingData?.overview || {
    totalGross: 0,
    totalCommission: 0,
    totalNet: 0,
    totalTransactions: 0,
    commissionRate: 20,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Tour Billing</h2>
        <p className="text-gray-400">
          Social marketplace billing overview with {overview.commissionRate}% commission
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-400 font-medium">GROSS</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(overview.totalGross)}
          </div>
          <p className="text-sm text-gray-400">Total revenue before commission</p>
        </div>

        {/* Commission */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-amber-400 font-medium">{overview.commissionRate}%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(overview.totalCommission)}
          </div>
          <p className="text-sm text-gray-400">Platform commission earned</p>
        </div>

        {/* Net to Sellers */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-blue-400 font-medium">NET</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatCurrency(overview.totalNet)}
          </div>
          <p className="text-sm text-gray-400">Total payable to sellers</p>
        </div>

        {/* Transaction Count */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-400 font-medium">SALES</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {overview.totalTransactions}
          </div>
          <p className="text-sm text-gray-400">Total transactions</p>
        </div>
      </div>

      {/* Seller Statements */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Seller Statements</h3>
          <p className="text-sm text-gray-400 mt-1">
            Breakdown of sales and earnings by seller
          </p>
        </div>

        {billingData?.sellerStatements && billingData.sellerStatements.length > 0 ? (
          <div className="divide-y divide-white/10">
            {billingData.sellerStatements.map((statement) => (
              <div key={statement.seller.id}>
                {/* Seller Row */}
                <button
                  onClick={() => toggleSellerExpanded(statement.seller.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-1">
                      {expandedSellers.has(statement.seller.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500/20 flex items-center justify-center">
                      {statement.seller.profilePhotoUrl ? (
                        <img
                          src={statement.seller.profilePhotoUrl}
                          alt={`${statement.seller.firstName} ${statement.seller.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-purple-400 font-semibold">
                          {statement.seller.firstName?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {statement.seller.firstName} {statement.seller.lastName}
                        </span>
                        {statement.seller.profileSlug && (
                          <a
                            href={`/user/${statement.seller.profileSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{statement.seller.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div>
                      <div className="text-sm text-gray-400">Sales</div>
                      <div className="text-white font-medium">{statement.totalSales}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Gross</div>
                      <div className="text-emerald-400 font-medium">
                        {formatCurrency(statement.totalGross)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Commission (20%)</div>
                      <div className="text-amber-400 font-medium">
                        -{formatCurrency(statement.totalCommission)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Net Payout</div>
                      <div className="text-blue-400 font-semibold">
                        {formatCurrency(statement.totalNet)}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Transactions */}
                {expandedSellers.has(statement.seller.id) && statement.transactions.length > 0 && (
                  <div className="bg-black/20 border-t border-white/5">
                    <div className="px-6 py-3">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="text-left py-2 pl-12">Item</th>
                            <th className="text-left py-2">Buyer</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-right py-2">Gross</th>
                            <th className="text-right py-2">Commission</th>
                            <th className="text-right py-2">Net</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {statement.transactions.map((tx) => (
                            <tr key={tx.id} className="border-t border-white/5">
                              <td className="py-3 pl-12">
                                <div className="flex items-center gap-3">
                                  {tx.listing.coverImageUrl ? (
                                    <img
                                      src={tx.listing.coverImageUrl}
                                      alt={tx.listing.title}
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-purple-500/20" />
                                  )}
                                  <div>
                                    <div className="text-white">{tx.listing.title}</div>
                                    <div className="text-xs text-gray-500">{tx.listing.category}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-gray-300">
                                {tx.buyer.firstName} {tx.buyer.lastName}
                              </td>
                              <td className="py-3 text-gray-400">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className="py-3 text-right text-emerald-400">
                                {formatCurrency(tx.grossAmount)}
                              </td>
                              <td className="py-3 text-right text-amber-400">
                                -{formatCurrency(tx.commissionAmount)}
                              </td>
                              <td className="py-3 text-right text-blue-400 font-medium">
                                {formatCurrency(tx.netAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No marketplace transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Transactions will appear here when users make purchases
            </p>
          </div>
        )}
      </div>

      {/* Commission Rate Note */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-amber-400 font-medium">Commission Structure</h4>
            <p className="text-sm text-gray-400 mt-1">
              A {overview.commissionRate}% commission is applied to all social marketplace transactions.
              Sellers receive {100 - overview.commissionRate}% of the sale price as their net payout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
