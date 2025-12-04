/**
 * Shop Page - Public product browsing and add to cart
 * Uses hardcoded Cassette theme (black bg, yellow #f0e226 accents)
 * This page is NOT theme-aware - it always uses Cassette styling
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Package,
  Download,
  Repeat,
  Check,
  Star,
  Loader2,
  Zap,
} from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { useCartStore } from '../store/cart.store';
import { shopApi } from '../lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  type: 'SIMPLE' | 'VARIABLE' | 'DIGITAL' | 'DOWNLOADABLE' | 'PHYSICAL' | 'SUBSCRIPTION';
  status: string;
  price: number;
  salePrice: number | null;
  featuredImageUrl: string | null;
  isFeatured: boolean;
  subscriptionInterval: string | null;
  subscriptionIntervalCount: number | null;
  trialDays: number | null;
  stripePriceId: string | null;
  toolId: string | null;
}

const PRODUCT_TYPE_ICONS: Record<string, typeof Package> = {
  SIMPLE: Package,
  VARIABLE: Package,
  DIGITAL: Zap,
  DOWNLOADABLE: Download,
  PHYSICAL: Package,
  SUBSCRIPTION: Repeat,
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SIMPLE: 'Product',
  VARIABLE: 'Variable',
  DIGITAL: 'Digital',
  DOWNLOADABLE: 'Download',
  PHYSICAL: 'Physical',
  SUBSCRIPTION: 'Subscription',
};

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    document.title = 'Shop - Producer Tour';
  }, []);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['shop-products', searchQuery, typeFilter],
    queryFn: async () => {
      const params: any = { status: 'ACTIVE' };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      const response = await shopApi.getProducts(params);
      return response.data;
    },
  });

  const products: Product[] = productsData?.products || [];

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);

    if (product.type === 'SUBSCRIPTION') {
      const existingSubscription = cartItems.find(
        (item) => item.productId === product.id && item.type === 'SUBSCRIPTION'
      );
      if (existingSubscription) {
        toast.error('This subscription is already in your cart');
        setAddingToCart(null);
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      quantity: 1,
      type: product.type,
      image: product.featuredImageUrl || undefined,
      subscriptionInterval: product.subscriptionInterval || undefined,
      subscriptionIntervalCount: product.subscriptionIntervalCount || undefined,
      stripePriceId: product.stripePriceId || undefined,
    });

    toast.success(`${product.name} added to cart`);
    setAddingToCart(null);
  };

  const isInCart = (productId: string) => {
    return cartItems.some((item) => item.productId === productId);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Noise texture overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="max-w-6xl mx-auto px-4 relative z-20">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 border border-[#f0e226]/30 text-[#f0e226] text-sm font-medium uppercase tracking-wider mb-6">
              <Zap className="w-4 h-4" />
              Producer Tools & Resources
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 uppercase tracking-wide">
              Shop
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Tools, resources, and subscriptions to help you grow your music career
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-12 max-w-2xl mx-auto"
          >
            {/* Search */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#f0e226] transition-colors z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 h-12 bg-[#19181a] border border-white/5 text-white placeholder:text-white/40 focus:border-[#f0e226]/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-12 px-4 bg-[#19181a] border border-white/5 text-white focus:border-[#f0e226]/50 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="SUBSCRIPTION">Subscriptions</option>
              <option value="DIGITAL">Digital</option>
              <option value="DOWNLOADABLE">Downloads</option>
              <option value="PHYSICAL">Physical</option>
            </select>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border border-[#f0e226]/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#f0e226]" />
                </div>
              </div>
              <p className="text-white/40 mt-4 uppercase tracking-wider text-sm">Loading products...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && products.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-20"
            >
              <div className="w-28 h-28 border border-[#f0e226]/30 flex items-center justify-center mx-auto mb-6">
                <Package className="w-14 h-14 text-[#f0e226]/50" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-4 uppercase tracking-wide">No products found</h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                {searchQuery || typeFilter
                  ? 'Try adjusting your search or filter criteria'
                  : 'Check back soon for new products and tools'}
              </p>
              {(searchQuery || (typeFilter && typeFilter !== 'all')) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                  }}
                  className="px-6 py-3 border border-[#f0e226] text-[#f0e226] uppercase tracking-wider text-sm font-medium hover:bg-[#f0e226] hover:text-black transition-all"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}

          {/* Products Grid */}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => {
                const TypeIcon = PRODUCT_TYPE_ICONS[product.type] || Package;
                const inCart = isInCart(product.id);
                const isAdding = addingToCart === product.id;
                const price = Number(product.price);
                const salePrice = product.salePrice ? Number(product.salePrice) : null;
                const hasDiscount = salePrice && salePrice < price;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    whileHover={{ y: -6, boxShadow: '0 25px 50px -12px rgba(240, 226, 38, 0.15)' }}
                    className="group relative bg-[#19181a] border border-white/5 overflow-hidden hover:border-[#f0e226]/30 transition-all duration-300"
                  >
                    {/* Clickable Link to Product Page */}
                    <Link to={`/shop/${product.slug}`} className="block">
                      {/* Product Image */}
                      <div className="relative h-52 bg-[#0f0f0f] overflow-hidden">
                        {product.featuredImageUrl ? (
                          <img
                            src={product.featuredImageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-20 h-20 border border-[#f0e226]/30 flex items-center justify-center">
                              <TypeIcon className="w-10 h-10 text-[#f0e226]/50" />
                            </div>
                          </div>
                        )}

                        {/* Featured Badge */}
                        {product.isFeatured && (
                          <span className="absolute top-4 left-4 px-3 py-1 bg-[#f0e226] text-black text-xs font-semibold uppercase tracking-wider">
                            <Star className="w-3 h-3 mr-1 inline fill-current" />
                            Featured
                          </span>
                        )}

                        {/* Sale Badge */}
                        {hasDiscount && (
                          <span className="absolute top-4 right-4 px-3 py-1 bg-[#f0e226] text-black text-xs font-semibold uppercase tracking-wider">
                            Sale
                          </span>
                        )}

                        {/* Type Badge */}
                        <span className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 border border-white/5 text-white/60 text-xs uppercase tracking-wider">
                          <TypeIcon className="w-3 h-3 mr-1 inline" />
                          {PRODUCT_TYPE_LABELS[product.type]}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="relative p-6 pb-0">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#f0e226] transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-white/60 text-sm mb-5 line-clamp-2 leading-relaxed">
                          {product.shortDescription || product.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-5">
                          {hasDiscount ? (
                            <>
                              <span className="text-2xl font-bold text-white">
                                ${salePrice!.toFixed(2)}
                              </span>
                              <span className="text-white/40 line-through text-sm">
                                ${price.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-white">
                              ${price.toFixed(2)}
                            </span>
                          )}
                          {product.type === 'SUBSCRIPTION' && product.subscriptionInterval && (
                            <span className="text-white/40 text-sm">
                              /{product.subscriptionInterval.toLowerCase()}
                            </span>
                          )}
                        </div>

                        {/* Trial Days */}
                        {product.type === 'SUBSCRIPTION' && product.trialDays && product.trialDays > 0 && (
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-1.5 h-1.5 bg-[#f0e226]" />
                            <span className="text-[#f0e226] text-sm font-medium">
                              {product.trialDays}-day free trial
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Add to Cart Button */}
                    <div className="px-6 pb-6">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={isAdding || (product.type === 'SUBSCRIPTION' && inCart)}
                        className={`w-full h-12 font-semibold uppercase tracking-wider text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                          inCart && product.type === 'SUBSCRIPTION'
                            ? 'bg-[#f0e226]/10 text-[#f0e226] border border-[#f0e226]/30'
                            : 'bg-[#f0e226] text-black hover:bg-[#d9cc22]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Adding...
                          </>
                        ) : inCart && product.type === 'SUBSCRIPTION' ? (
                          <>
                            <Check className="w-5 h-5" />
                            In Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-24 text-center"
          >
            <div className="bg-[#19181a] border border-white/5 p-10 md:p-14 max-w-2xl mx-auto">
              <div className="w-14 h-14 border border-[#f0e226]/30 flex items-center justify-center mx-auto mb-6">
                <Zap className="w-7 h-7 text-[#f0e226]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">Looking for something specific?</h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                Check out our pricing page for subscription bundles and tool packages designed for producers.
              </p>
              <Link
                to="/pricing"
                className="inline-block px-8 py-4 bg-[#f0e226] text-black font-semibold uppercase tracking-wider hover:bg-[#d9cc22] transition-all"
              >
                View Pricing Plans
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
