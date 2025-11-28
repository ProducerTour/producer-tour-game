import React from 'react';
import { Wifi, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  minimumWithdrawalAmount?: number;
}

interface WalletCardProps {
  balance: WalletBalance;
  isLoading?: boolean;
  onWithdraw: () => void;
  userName?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  isLoading = false,
  onWithdraw,
  userName = 'PRODUCER TOUR MEMBER',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const minimumAmount = balance.minimumWithdrawalAmount || 50;
  const canWithdraw = balance.availableBalance >= minimumAmount;

  return (
    <div className="space-y-4">
      {/* Credit Card Design */}
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl shadow-2xl"
        style={{ aspectRatio: '1.586' }}
      >
        {/* Card Background - Premium gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 blur-2xl" />
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {isLoading ? (
          <div className="relative h-full flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading wallet...</div>
          </div>
        ) : (
          <div className="relative h-full p-5 flex flex-col justify-between">
            {/* Top Row - Logo & Contactless */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-medium">Producer Tour</p>
                <p className="text-xs text-gray-500 mt-0.5">Writer Wallet</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Contactless icon */}
                <Wifi className="w-6 h-6 text-gray-400 rotate-90" />
              </div>
            </div>

            {/* Chip */}
            <div className="flex items-center gap-4">
              {/* EMV Chip */}
              <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-lg overflow-hidden">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px p-0.5">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-amber-600/40 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>

            {/* Balance as Card Number */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Available Balance</p>
              <p className="text-2xl font-mono font-bold text-white tracking-wider">
                {formatCurrency(balance.availableBalance)}
              </p>
            </div>

            {/* Bottom Row - Cardholder & Valid */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">Cardholder</p>
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                  {userName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">Lifetime</p>
                <p className="text-xs font-medium text-emerald-400">
                  {formatCurrency(balance.lifetimeEarnings)}
                </p>
              </div>
            </div>

            {/* Card brand / Logo */}
            <div className="absolute bottom-5 right-5">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-red-500/80" />
                <div className="w-7 h-7 rounded-full bg-amber-500/80" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Cards Below */}
      <div className="max-w-[400px] space-y-3">
        {/* Pending Balance */}
        {balance.pendingBalance > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">Pending Withdrawal</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(balance.pendingBalance)}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2 py-1 rounded-full">
                Processing
              </span>
            </div>
          </div>
        )}

        {/* Lifetime Stats */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-xs">Total Earned All Time</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(balance.lifetimeEarnings)}
              </p>
            </div>
          </div>
        </div>

        {/* Withdraw Button */}
        <button
          onClick={onWithdraw}
          disabled={!canWithdraw}
          className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all text-sm ${
            canWithdraw
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5'
              : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {canWithdraw
            ? 'Request Withdrawal'
            : balance.availableBalance > 0
            ? `Minimum ${formatCurrency(minimumAmount)} Required`
            : 'No Balance Available'}
        </button>

        {!canWithdraw && balance.availableBalance > 0 && (
          <p className="text-xs text-center text-amber-400/80 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Need {formatCurrency(minimumAmount - balance.availableBalance)} more to withdraw
          </p>
        )}

        {canWithdraw && (
          <p className="text-xs text-center text-gray-500">
            Withdrawals are reviewed within 1-2 business days
          </p>
        )}
      </div>
    </div>
  );
};
