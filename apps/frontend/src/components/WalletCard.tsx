import React from 'react';
import { Wifi, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import ptLogo from '../assets/images/logos/whitetransparentpt.png';

interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  minimumWithdrawalAmount?: number;
  // Eligibility info from API
  canWithdraw?: boolean;
  requiresStripeSetup?: boolean;
  requiresTaxInfo?: boolean;
  hasSufficientBalance?: boolean;
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

  // Use API-provided eligibility if available, otherwise fallback to balance check
  const canWithdraw = balance.canWithdraw !== undefined
    ? balance.canWithdraw
    : balance.availableBalance >= minimumAmount;

  // Determine the specific reason why withdrawal is blocked
  const getWithdrawBlockReason = (): string | null => {
    if (balance.requiresStripeSetup) {
      return 'Complete Stripe setup first';
    }
    if (balance.requiresTaxInfo) {
      return 'Submit tax info first';
    }
    if (balance.availableBalance <= 0) {
      return 'No Balance Available';
    }
    if (balance.availableBalance < minimumAmount) {
      return `Minimum ${formatCurrency(minimumAmount)} Required`;
    }
    return null;
  };

  const blockReason = getWithdrawBlockReason();

  return (
    <div className="space-y-4">
      {/* Credit Card Design */}
      <div
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl shadow-2xl"
        style={{ aspectRatio: '1.586' }}
      >
        {/* Card Background - Sleek black with shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
          {/* Shine effect - diagonal glossy stripe */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
            }}
          />
          {/* Secondary subtle shine */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              background: 'linear-gradient(160deg, transparent 60%, rgba(255,255,255,0.3) 75%, transparent 85%)',
            }}
          />
          {/* Edge highlight */}
          <div className="absolute inset-0 rounded-2xl" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
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
              {/* Producer Tour Logo */}
              <img
                src={ptLogo}
                alt="Producer Tour"
                className="h-8 w-auto opacity-90"
              />
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

            {/* Bottom Row - Cardholder & Lifetime/Logo */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">Cardholder</p>
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                  {userName}
                </p>
              </div>

              {/* Right side - Lifetime earnings above logo */}
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">Lifetime Earned</p>
                <p className="text-sm font-semibold text-emerald-400 mb-2">
                  {formatCurrency(balance.lifetimeEarnings)}
                </p>
                {/* Producer Tour Logo */}
                <img
                  src={ptLogo}
                  alt="Producer Tour"
                  className="h-8 w-auto ml-auto opacity-90"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Cards Below */}
      <div className="max-w-[400px] space-y-3">
        {/* Pending Balance */}
        {balance.pendingBalance > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs">Pending Withdrawal</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(balance.pendingBalance)}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                Processing
              </span>
            </div>
          </div>
        )}

        {/* Lifetime Stats */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Total Earned All Time</p>
              <p className="text-lg font-semibold text-gray-900">
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
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          {canWithdraw ? 'Request Withdrawal' : blockReason}
        </button>

        {/* Helper text based on block reason */}
        {!canWithdraw && balance.requiresStripeSetup && (
          <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Connect your Stripe account to receive payments
          </p>
        )}

        {!canWithdraw && !balance.requiresStripeSetup && balance.requiresTaxInfo && (
          <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Tax information required for 1099 reporting
          </p>
        )}

        {!canWithdraw && !balance.requiresStripeSetup && !balance.requiresTaxInfo && balance.availableBalance > 0 && balance.availableBalance < minimumAmount && (
          <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1">
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
