import React, { useState } from 'react';
import { DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
}

interface WalletCardProps {
  balance: WalletBalance;
  isLoading?: boolean;
  onWithdraw: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  isLoading = false,
  onWithdraw,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const canWithdraw = balance.availableBalance >= 50;
  const isAnyBalanceAvailable = balance.availableBalance > 0;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg shadow-lg p-6 border border-slate-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary-400" />
          Your Wallet
        </h2>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-600/50 rounded-lg"></div>
          <div className="h-16 bg-slate-600/50 rounded-lg"></div>
          <div className="h-16 bg-slate-600/50 rounded-lg"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Available Balance - Primary Display */}
          <div className="bg-slate-900/50 rounded-lg p-6 border-2 border-primary-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Available Balance</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(balance.availableBalance)}
                </p>
                {!canWithdraw && isAnyBalanceAvailable && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Minimum withdrawal: $50.00
                  </p>
                )}
              </div>
              <DollarSign className="h-12 w-12 text-primary-400/30" />
            </div>
          </div>

          {/* Pending Balance */}
          {balance.pendingBalance > 0 && (
            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Pending Withdrawal</p>
                    <p className="text-xl font-semibold text-white">
                      {formatCurrency(balance.pendingBalance)}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Awaiting admin approval
              </p>
            </div>
          )}

          {/* Lifetime Earnings */}
          <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-gray-400 text-sm">Lifetime Earnings</p>
                  <p className="text-xl font-semibold text-white">
                    {formatCurrency(balance.lifetimeEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Withdraw Button */}
          <button
            onClick={onWithdraw}
            disabled={!canWithdraw}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              canWithdraw
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-primary-500/50'
                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canWithdraw
              ? 'Withdraw Funds'
              : balance.availableBalance > 0
              ? 'Insufficient Balance (Min $50)'
              : 'No Balance Available'}
          </button>

          {canWithdraw && (
            <p className="text-xs text-center text-gray-400">
              Withdrawal requests require admin approval
            </p>
          )}
        </div>
      )}
    </div>
  );
};
