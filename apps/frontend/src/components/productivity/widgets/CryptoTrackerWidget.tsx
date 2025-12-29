import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Bitcoin, Loader2, RefreshCw } from 'lucide-react';
import type { WidgetProps, CryptoConfig } from '../../../types/productivity.types';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

/**
 * CryptoTrackerWidget - Cryptocurrency prices
 *
 * Features:
 * - Real-time prices from CoinGecko (free API)
 * - BTC, ETH, and popular coins
 * - 24h price change with colors
 * - Market cap display
 */
export default function CryptoTrackerWidget({ config, isEditing }: WidgetProps) {
  const cryptoConfig = config as CryptoConfig;
  const coins = cryptoConfig.coins || ['bitcoin', 'ethereum', 'solana', 'cardano'];
  const currency = cryptoConfig.currency || 'usd';

  // Fetch crypto prices from CoinGecko
  const { data: prices, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['crypto-prices', coins, currency],
    queryFn: async (): Promise<CryptoPrice[]> => {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coins.join(',')}&order=market_cap_desc&sparkline=false`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  });

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 4 : 2,
    }).format(price);
  };

  // Format market cap
  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap.toLocaleString()}`;
  };

  // Get coin icon fallback
  const getCoinIcon = (symbol: string) => {
    const iconMap: Record<string, string> = {
      btc: '₿',
      eth: 'Ξ',
      sol: '◎',
      ada: '₳',
      dot: '●',
      matic: '⬡',
      avax: '🔺',
      link: '⬡',
    };
    return iconMap[symbol.toLowerCase()] || symbol.toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bitcoin className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-theme-foreground">Crypto</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isEditing || isFetching}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Refresh prices"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-theme-foreground-muted ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Price List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {!prices || prices.length === 0 ? (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            Unable to load prices
          </div>
        ) : (
          prices.map(coin => {
            const isPositive = coin.price_change_percentage_24h >= 0;

            return (
              <div
                key={coin.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {/* Coin Icon */}
                {coin.image ? (
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-400">
                      {getCoinIcon(coin.symbol)}
                    </span>
                  </div>
                )}

                {/* Coin Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-theme-foreground">
                      {coin.symbol.toUpperCase()}
                    </span>
                    <span className="text-xs text-theme-foreground-muted truncate">
                      {coin.name}
                    </span>
                  </div>
                  <span className="text-xs text-theme-foreground-muted">
                    MCap: {formatMarketCap(coin.market_cap)}
                  </span>
                </div>

                {/* Price & Change */}
                <div className="text-right">
                  <span className="font-medium text-theme-foreground block">
                    {formatPrice(coin.current_price)}
                  </span>
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <span className="text-xs text-theme-foreground-muted">
          Data from CoinGecko • Updates every 2 min
        </span>
      </div>
    </div>
  );
}
